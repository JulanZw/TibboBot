import path from 'path';

import { TToolboxLogger } from '@julanzw/ttoolbox-discord-framework';

export class BotLogger extends TToolboxLogger {
  override rotate(): BotLogger {
    const now = new Date();
    const year = now.getFullYear();
    const week = getISOWeekNumber(now);
    const newLogName = `${year}_W${week}.log`;
    const logDir = path.dirname(this.getLogFilePath());

    return new BotLogger({
      logDir,
      logFileName: newLogName,
      customLevels: this.getAvailableLevels(),
      extendDefaultLevels: false,
    });
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
