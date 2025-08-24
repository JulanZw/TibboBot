import { PrismaClient } from '@prisma/client';
import { Client } from 'discord.js';

import { logWithTime } from '../utils/logging';

export function setupErrorHandlers(client: Client, prisma: PrismaClient) {
  async function gracefulShutdown(signal: string) {
    const scope = 'shutdown';
    logWithTime(`${signal} received. Cleaning up...`, 'info', scope);

    try {
      if (client.isReady()) {
        logWithTime(`Destroying Discord client...`, 'info', scope);
        await client.destroy();
      }
    } catch (err: any) {
      logWithTime(
        `Failed to destroy Discord client: ${err}`,
        'error',
        scope,
        true,
      );
    }

    try {
      logWithTime(`Disconnecting Prisma...`, 'info', scope);
      await prisma.$disconnect();
    } catch (err: any) {
      logWithTime(`Failed to disconnect Prisma: ${err}`, 'error', scope, true);
    }

    process.exit(0);
  }

  process.on('uncaughtException', (err: any) => {
    logWithTime(`Uncaught Exception: ${err}`, 'error', 'errorhandler', true);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any) => {
    logWithTime(`Unhandled Rejection: ${reason}`, 'warn', 'errorhandler');
  });

  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));

  logWithTime('Error handlers set up.', 'info', 'startup');
}
