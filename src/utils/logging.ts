import path from 'path';
import fs from 'fs';

import { LogLevel } from './typesAndInterfaces';
import { formatDateToYYYYMMDDHHMMSS } from './formatting';

const logDir = path.resolve(__dirname, '../../logs');

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
  level: LogLevel,
  scope: string,
  logToConsole: boolean = false,
): void {
  const logMessage = `[${formatDateToYYYYMMDDHHMMSS(new Date())}] [${scope}/${level.toUpperCase()}] ${message}\n`;

  fs.appendFileSync(logFilePath, logMessage, 'utf8');

  if (logToConsole) {
    const colorMap = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    console.log(`${colorMap[level]}${logMessage.trim()}${reset}`);
  }
}
