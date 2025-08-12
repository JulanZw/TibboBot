import path from 'path';
import fs from 'fs';

import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';

import { scheduleReminder } from './utils/general';
import { formatDateToString, getDaySuffix } from './utils/formatting';
import { sourceRequestTracker } from './utils/globals';
import { getAllBirthdaysInGuildForGivenDate } from './database/birthday';
import { getAllGuilds } from './database/guild';
import { getRemindersOfToday } from './database/reminders';
import { logWithTime } from './utils/logging';

export function setupCronJobs(client: Client): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('0 0 * * *', async () => {
    const scope = 'cron_DAILY';
    try {
      const randomDelay = Math.floor(Math.random() * 2801) + 200; // 0–3000 ms

      await new Promise((resolve) =>
        setTimeout(resolve, randomDelay < 0 ? 1500 : randomDelay),
      ); // the delay below 0 happend once so this is just in case

      const guilds = await getAllGuilds();
      const formattedDate = formatDateToString(new Date());

      // Today-is messages
      await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild.todayIsChannelId) return;

          try {
            const channel = await client.channels.fetch(guild.todayIsChannelId);
            if (!channel || !(channel instanceof TextChannel)) {
              logWithTime(
                `Channel for guild ${guild.guildId} not found or not text-based.`,
                'error',
                scope,
              );
              return;
            }

            await channel.send(
              `Today is ${formattedDate}, waited for ${randomDelay} ms`,
            );
            logWithTime(
              `Message sent in ${guild.guildId}: "Today is ${formattedDate}"`,
              'info',
              scope,
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send 'today is' message in guild ${guild.guildId}: ${err}`,
              'error',
              scope,
            );
          }
        }),
      );

      // Birthday messages
      await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild.birthdayChannelId) return;

          try {
            const channel = await client.channels.fetch(
              guild.birthdayChannelId,
            );
            if (!channel || !(channel instanceof TextChannel)) {
              logWithTime(
                `Birthday channel in guild ${guild.guildId} not found or not text-based.`,
                'error',
                scope,
                true,
              );
              return;
            }

            const birthdays = await getAllBirthdaysInGuildForGivenDate(
              guild.guildId,
              new Date(),
            );

            await Promise.allSettled(
              birthdays.map(async (birthday) => {
                const birthdayYear =
                  new Date().getFullYear() - birthday.birthday.getFullYear();
                await channel.send(
                  `Congratulations with your ${birthdayYear + getDaySuffix(birthdayYear)} birthday <@${birthday.userId}> 🎉!`,
                );
                logWithTime(
                  `Message send in ${birthday.guildId}: "Happy Birthday <@${birthday.userId}>!"`,
                  'info',
                  scope,
                );
              }),
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send birthday messages in guild ${guild.guildId}: ${err}`,
              'error',
              scope,
              true,
            );
          }
        }),
      );

      try {
        const todaysReminders = await getRemindersOfToday();

        for (const reminder of todaysReminders) {
          const user = await client.users.fetch(reminder.userId);
          scheduleReminder(user, reminder);
        }

        logWithTime(
          `Scheduled ${todaysReminders.length} reminders for today.`,
          'info',
          scope,
        );
      } catch (err: any) {
        logWithTime(
          `Failed to schedule today's reminders: ${err}`,
          'error',
          scope,
          true,
        );
      }

      // Reset sourceRequestTracker
      sourceRequestTracker.clear();
    } catch (err: any) {
      logWithTime('Error in daily cron job:' + err, 'error', scope, true);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('0 0 1 1 *', async () => {
    const scope = 'cron_YEARLY';
    try {
      const guilds = await getAllGuilds();
      await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild.todayIsChannelId) return;

          try {
            const channel = await client.channels.fetch(guild.todayIsChannelId);
            if (!channel || !(channel instanceof TextChannel)) {
              logWithTime(
                `Channel for guild ${guild.guildId} not found or not text-based.`,
                'error',
                scope,
                true,
              );
              return;
            }

            await channel.send(`🎆 Happy New Year!`);
            logWithTime(
              `Message sent in ${guild.guildId}: "🎆 Happy New Year!"`,
              'info',
              scope,
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send 'Happy new Year' message in guild ${guild.guildId}: ${err}`,
              'error',
              scope,
              true,
            );
          }
        }),
      );
    } catch (err: any) {
      logWithTime('Error in yearly cron job:' + err, 'error', scope, true);
    }
  });

  cron.schedule('0 0 * * 1', () => {
    const scope = 'cron_WEEKLY';
    try {
      const logsDir = path.resolve(__dirname, '../logs');
      const latestLog = path.join(logsDir, 'latest.log');
      const now = new Date();
      const year = now.getFullYear();
      const week = getISOWeekNumber(now);
      const newLogName = `${year}_W${week}.log`;
      const newLogPath = path.join(logsDir, newLogName);

      if (fs.existsSync(latestLog)) {
        fs.renameSync(latestLog, newLogPath);
        fs.writeFileSync(latestLog, '');
        logWithTime(`Rotated log: ${newLogName}`, 'info', scope);
      }
    } catch (err: any) {
      logWithTime('Error in weekly log rotation: ' + err, 'error', scope, true);
    }
  });

  logWithTime(
    'Cron jobs have been set up successfully.',
    'info',
    'startup_CRON',
  );
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
