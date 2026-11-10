import path from 'path';
import fs from 'fs';

import { TToolboxLogger } from '@julanzw/ttoolbox-discordjs-framework';

export class BotLogger extends TToolboxLogger {
  /**
   * Creates a new log file with a timestamp-based name
   * and moves content of the current log to that file.
   *
   * @returns This logger instance
   *
   * @example
   * ```typescript
   * logger.rotate();
   * logger.info('New log file started', 'logger');
   * ```
   */
  override rotate(): this {
    const now = new Date();
    const year = now.getFullYear();
    const weekNumber = getISOWeekNumber(now);
    const logName = `${year}_W${weekNumber}.log`;
    const logDir = path.dirname(this.getLogFilePath());

    fs.copyFileSync(this.logFilePath, path.join(logDir, logName));

    this.clearLog();

    this.info(`Rotated log. New logfile: ${logName}`, 'logger');

    return this;
  }
}

function getISOWeekNumber(date: Date): number {
  const tmp = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
