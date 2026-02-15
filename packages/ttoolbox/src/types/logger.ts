/**
 * Configuration options for TToolboxLogger.
 */
export type LoggerOptions = {
  /** Directory where log files should be stored */
  logDir?: string;
  /** Name of the log file */
  logFileName?: string;
  /** Custom log levels to use instead of defaults */
  customLevels?: Record<string, string>;
  /** Whether to extend default levels or replace them entirely */
  extendDefaultLevels?: boolean;
};

/**
 * Logger interface for TToolbox framework.
 *
 * Allows any logger implementation to be used with the framework,
 * as long as it provides these core methods.
 *
 * @example
 * ```typescript
 * const customLogger: ILogger = {
 *   log: (msg, level, scope, console) => myCustomLog(msg),
 *   info: (msg, scope, console) => console.log(msg),
 *   warn: (msg, scope, console) => console.warn(msg),
 *   error: (msg, scope, console) => console.error(msg),
 * };
 *
 * commandManager.setLogger(customLogger);
 * ```
 */
export interface ILogger {
  log(
    message: string,
    level: string,
    scope: string,
    logToConsole?: boolean,
  ): void;
  info(message: string, scope: string, logToConsole?: boolean): void;
  warn(message: string, scope: string, logToConsole?: boolean): void;
  error(message: string, scope: string, logToConsole?: boolean): void;
}
