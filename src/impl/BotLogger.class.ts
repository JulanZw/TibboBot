import path from 'path';

import { TToolboxLogger } from '@julanzw/ttoolbox-discordjs-framework';

export class BotLogger extends TToolboxLogger {
  /**
   * Creates a new log file with a week-based name and returns a new logger instance.
   *
   * Used for log rotation - creates a new file while keeping the old one.
   * @returns A new BotLogger instance pointing to the new log file
   */
  override rotate(): this {
    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeekNumber(now);
    const newLogName = `${year}_W${week}.log`;
    const logDir = path.dirname(this.getLogFilePath());

    this.logFilePath = path.join(logDir, newLogName);

    this.info(`Rotated log. New logfile: ${newLogName}`, 'logger');

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
