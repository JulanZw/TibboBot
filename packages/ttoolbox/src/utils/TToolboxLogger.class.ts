/* eslint-disable no-inline-comments */
import path from 'path';
import fs from 'fs';

import { ILogger, LoggerOptions } from '../types/logger.js';

import { formatDateToYYYYMMDDHHMMSS } from './formatting.js';

/**
 * Logger class for TToolbox framework with file and console logging capabilities.
 *
 * Provides timestamped logging with different severity levels and optional
 * console output with color coding. Supports custom log levels and colors.
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const logger = new TToolboxLogger();
 * logger.info('Bot started', 'startup');
 *
 * // With custom log levels
 * const logger = new TToolboxLogger({
 *   customLevels: {
 *     debug: '\x1b[35m' , // Magenta
 *     success: color: '\x1b[32m', // Green
 *   },
 *   extendDefaultLevels: true
 * });
 *
 * logger.log('Debug info', 'debug', 'system');
 * logger.log('Operation succeeded', 'success', 'api', true);
 * ```
 */
export class TToolboxLogger implements ILogger {
  private logFilePath: string;
  private levels: Record<string, string>;
  private reset = '\x1b[0m';

  // Default log levels
  private static readonly DEFAULT_LEVELS: Record<string, string> = {
    info: '\x1b[36m', // Cyan
    warn: '\x1b[33m', //  Yellow
    error: '\x1b[31m', // Red
  };

  /**
   * Creates a new TToolboxLogger instance.
   *
   * @param optionsOrLogDir - Either a LoggerOptions object or a string path to the log directory
   * @param logFileName - The name of the log file when using the string path signature (defaults to 'latest.log')
   *
   * @example
   * ```typescript
   * // Simple usage - defaults to ./logs/latest.log
   * const logger = new TToolboxLogger();
   *
   * // Just custom directory
   * const logger = new TToolboxLogger('./my-logs');
   *
   * // Custom directory and filename
   * const logger = new TToolboxLogger('./logs', 'bot.log');
   *
   * // With options object
   * const logger = new TToolboxLogger({
   *   logDir: './logs',
   *   logFileName: 'bot.log',
   *   customLevels: {
   *     debug: { color: '\x1b[35m' },
   *   },
   *   extendDefaultLevels: true
   * });
   * ```
   */
  constructor(
    optionsOrLogDir?: string | LoggerOptions,
    logFileName: string = 'latest.log',
  ) {
    let options: LoggerOptions;

    if (typeof optionsOrLogDir === 'string') {
      // Basic signature: new TToolboxLogger('./logs', 'file.log')
      options = {
        logDir: optionsOrLogDir,
        logFileName: logFileName,
      };
    } else if (optionsOrLogDir) {
      // Advanced signature: new TToolboxLogger({ logDir: './logs', ... })
      options = optionsOrLogDir;
    } else {
      // No arguments: new TToolboxLogger()
      options = {};
    }

    const {
      logDir = './logs',
      logFileName: fileName = logFileName,
      customLevels = {},
      extendDefaultLevels = true,
    } = options;

    // Set up log levels
    if (extendDefaultLevels) {
      this.levels = { ...TToolboxLogger.DEFAULT_LEVELS, ...customLevels };
    } else {
      this.levels =
        Object.keys(customLevels).length > 0
          ? customLevels
          : TToolboxLogger.DEFAULT_LEVELS;
    }

    // Resolve log directory
    const resolvedLogDir = path.isAbsolute(logDir)
      ? logDir
      : path.resolve(process.cwd(), logDir);

    if (!fs.existsSync(resolvedLogDir)) {
      fs.mkdirSync(resolvedLogDir, { recursive: true });
    }

    this.logFilePath = path.join(resolvedLogDir, fileName);
  }

  /**
   * Logs a message with timestamp, level, and scope.
   *
   * @param message - The message to log
   * @param level - The severity level of the log (must match a configured level)
   * @param scope - The scope or context of the log (e.g., 'database', 'api', 'command')
   * @param logToConsole - Whether to also output to console with color coding (defaults to false)
   *
   * @throws {Error} If the specified level doesn't exist
   *
   * @example
   * ```typescript
   * logger.log('User joined', 'info', 'events');
   * logger.log('Debug info', 'debug', 'system', true);
   * logger.log('Critical error', 'error', 'database', true);
   * ```
   */
  log(
    message: string,
    level: string,
    scope: string,
    logToConsole: boolean = false,
  ): void {
    const color = this.levels[level];

    if (!color) {
      throw new Error(
        `Unknown log level: "${level}". Available levels: ${Object.keys(this.levels).join(', ')}`,
      );
    }

    const logMessage = `[${formatDateToYYYYMMDDHHMMSS(new Date())}] [${level.toUpperCase()}] [${scope}] ${message}\n`;

    // Write to file
    fs.appendFileSync(this.logFilePath, logMessage, 'utf8');

    // Optionally log to console with colors
    if (logToConsole) {
      console.log(`${color}${logMessage.trim()}${this.reset}`);
    }
  }

  /**
   * Logs an info-level message.
   *
   * Convenience method for logging informational messages.
   *
   * @param message - The message to log
   * @param scope - The scope or context of the log
   * @param logToConsole - Whether to also output to console (defaults to false)
   *
   * @example
   * ```typescript
   * logger.info('Bot started successfully', 'startup', true);
   * ```
   */
  info(message: string, scope: string, logToConsole: boolean = false): void {
    this.log(message, 'info', scope, logToConsole);
  }

  /**
   * Logs a warning-level message.
   *
   * Convenience method for logging warning messages.
   *
   * @param message - The message to log
   * @param scope - The scope or context of the log
   * @param logToConsole - Whether to also output to console (defaults to false)
   *
   * @example
   * ```typescript
   * logger.warn('Rate limit approaching', 'api', true);
   * ```
   */
  warn(message: string, scope: string, logToConsole: boolean = false): void {
    this.log(message, 'warn', scope, logToConsole);
  }

  /**
   * Logs an error-level message.
   *
   * Convenience method for logging error messages.
   *
   * @param message - The message to log
   * @param scope - The scope or context of the log
   * @param logToConsole - Whether to also output to console (defaults to true)
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed', 'database', true);
   * ```
   */
  error(message: string, scope: string, logToConsole: boolean = true): void {
    this.log(message, 'error', scope, logToConsole);
  }

  /**
   * Gets all available log levels with their colors.
   *
   * @returns Record of log level names to their color
   *
   * @example
   * ```typescript
   * const levels = logger.getAvailableLevels();
   * console.log(Object.keys(levels)); // ['info', 'warn', 'error', 'debug']
   * ```
   */
  getAvailableLevels(): Record<string, string> {
    return this.levels;
  }

  /**
   * Gets the path to the current log file.
   *
   * @returns The absolute path to the log file
   *
   * @example
   * ```typescript
   * console.log('Logging to:', logger.getLogFilePath());
   * ```
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Clears the current log file.
   *
   * Useful for rotating logs or starting fresh.
   *
   * @example
   * ```typescript
   * logger.clearLog();
   * logger.info('Log cleared, starting fresh', 'system');
   * ```
   */
  clearLog(): void {
    fs.writeFileSync(this.logFilePath, '', 'utf8');
  }

  /**
   * Creates a new log file with a timestamp-based name and returns a new logger instance.
   *
   * Useful for log rotation - creates a new file while keeping the old one.
   *
   * @returns A new TToolboxLogger instance pointing to the new log file
   *
   * @example
   * ```typescript
   * // Rotate logs daily
   * let logger = new TToolboxLogger('./logs');
   *
   * // Later, create a new log file
   * logger = logger.rotate();
   * ```
   */
  rotate(): TToolboxLogger {
    const timestamp = formatDateToYYYYMMDDHHMMSS(new Date());
    const logDir = path.dirname(this.logFilePath);
    const newFileName = `log-${timestamp}.log`;

    return new TToolboxLogger({
      logDir,
      logFileName: newFileName,
      customLevels: this.levels,
      extendDefaultLevels: false,
    });
  }
}
