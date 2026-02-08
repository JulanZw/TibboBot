import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { formatDateToYYYYMMDDHHMMSS } from './formatting.ts';

const logDir = path.resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../logs',
);

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'latest.log');

/**
 * Logs a message with a timestamp and level to the log file.
 *
 * @param message - The message to log
 * @param level - The level of the log (info, warn, error)
 * @param logToConsole - If it should also be logged to the console or not, default false
 */
export function logWithTime(
  message: string,
  level: 'info' | 'warn' | 'error',
  scope: string,
  logToConsole: boolean = false,
): void {
  const logMessage = `[${formatDateToYYYYMMDDHHMMSS(new Date())}] [${level.toUpperCase()}] [${scope}] ${message}\n`;

  fs.appendFileSync(logFilePath, logMessage, 'utf8');

  if (logToConsole) {
    const colorMap = {
      // Cyan
      info: '\x1b[36m',
      // Yellow
      warn: '\x1b[33m',
      // Red
      error: '\x1b[31m',
    };
    const reset = '\x1b[0m';

    console.log(`${colorMap[level]}${logMessage.trim()}${reset}`);
  }
}
