import http from 'http';

import { Client, Status } from 'discord.js';

import { prisma } from './globals.ts';
import { logWithTime } from './logging.ts';

const scope = 'health';

/**
 * Port the health endpoint listens on. Defaults to 8090
 */
const port = Number(process.env.HEALTH_PORT ?? 8090);

/**
 * Interface to bind on. Use 127.0.0.1 if the uptime checker runs on the same machine
 * and you don't want the endpoint reachable from the LAN.
 */
const host = process.env.HEALTH_HOST ?? '0.0.0.0';

/**
 * Max time the database check may take before it counts as failed.
 */
const DB_TIMEOUT_MS = 3000;

const startedAt = Date.now();

/**
 * Checks if the database responds to a trivial query within the timeout.
 */
async function checkDatabase(): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), DB_TIMEOUT_MS);
      }),
    ]);
    return true;
  } catch (err: any) {
    logWithTime(`Database health check failed: ${err}`, 'warn', scope);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Starts a tiny HTTP server for uptime checkers.
 *
 * `GET /health` returns 200 when the bot is connected to the Discord gateway and the
 * database responds, otherwise 503. The JSON body says which part is failing.
 *
 * @param client - The discord client to report on
 */
export function startHealthServer(client: Client): http.Server {
  const server = http.createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0];

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end();
      return;
    }

    if (path !== '/health' && path !== '/healthz') {
      res.writeHead(404).end();
      return;
    }

    void (async () => {
      const discordReady =
        client.isReady() && client.ws.status === Status.Ready;
      const databaseOk = await checkDatabase();
      const healthy = discordReady && databaseOk;

      const body = JSON.stringify({
        status: healthy ? 'ok' : 'unhealthy',
        discord: {
          status: Status[client.ws.status],
          ping: client.ws.ping,
        },
        database: databaseOk ? 'ok' : 'unreachable',
        uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
      });

      res.writeHead(healthy ? 200 : 503, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    })();
  });

  server.on('error', (err) => {
    logWithTime(`Health server error: ${err}`, 'error', scope, true);
  });

  server.listen(port, host, () => {
    logWithTime(
      `Health endpoint listening on http://${host}:${port}/health`,
      'info',
      scope,
      true,
    );
  });

  return server;
}
