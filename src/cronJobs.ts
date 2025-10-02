import path from 'path';
import fs from 'fs';

import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';

import { scheduleReminder } from './utils/general.ts';
import { formatDateToString, getDaySuffix } from './utils/formatting.ts';
import { getAllBirthdaysInGuildForGivenDate } from './database/birthday.ts';
import { getAllGuilds, updateDumbScore } from './database/guild.ts';
import { getRemindersOfToday } from './database/reminders.ts';
import { logWithTime } from './utils/logging.ts';
import { todayWinners } from './utils/globals.ts';
import { getBotAction, getDefeatedMessage } from './utils/todayis.ts';

export function setupCronJobs(client: Client): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('0 0 * * *', async () => {
    const scope = 'cron_DAILY';
    try {
      const guilds = await getAllGuilds();
      await runTodayIsMessages(client, guilds);
      await runBirthdayMessages(client, guilds);
      await scheduleReminders(client);
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

  logWithTime('Cron jobs have been set up successfully.', 'info', 'startup');
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

async function runTodayIsMessages(
  client: Client,
  guilds: Awaited<ReturnType<typeof getAllGuilds>>,
) {
  const scope = 'cron_DAILY_TODAYIS';

  Object.keys(todayWinners).forEach((key) => delete todayWinners[key]);
  const randomDelay = Math.floor(Math.random() * 2801) + 200; // 200–3000 ms

  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay < 0 ? 1500 : randomDelay),
  ); // the delay below 0 happend once so this is just in case

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

        if (todayWinners[guild.guildId]) {
          const message = getDefeatedMessage(guild.dumbScore);
          await channel.send(message);
          logWithTime(
            `Message sent in ${guild.guildId}: "${message}"`,
            'info',
            scope,
          );
          return;
        } else {
          todayWinners[guild.guildId] = 'bot';
          await updateDumbScore(guild.guildId, false);
        }

        const botAction = getBotAction(guild.dumbScore);
        if (botAction.type === 'skip') {
          await channel.send(botAction.answer);
          logWithTime(
            `Skipping 'Today is' message in guild ${guild.guildId}: ${botAction.answer}`,
            'info',
            scope,
          );
          return;
        } else if (botAction.type === 'funny') {
          await channel.send(botAction.answer);
          logWithTime(
            `Sending funny 'Today is' message in guild ${guild.guildId}: ${botAction.answer}`,
            'info',
            scope,
          );
          return;
        } else {
          const formattedDate = formatDateToString(new Date());
          await channel.send(
            `Today is ${formattedDate}, waited for ${randomDelay} ms`,
          );
          logWithTime(
            `Message sent in ${guild.guildId}: "Today is ${formattedDate}"`,
            'info',
            scope,
          );
        }
      } catch (err: any) {
        logWithTime(
          `Failed to send 'today is' message in guild ${guild.guildId}: ${err}`,
          'error',
          scope,
        );
      }
    }),
  );
}

async function runBirthdayMessages(
  client: Client,
  guilds: Awaited<ReturnType<typeof getAllGuilds>>,
) {
  const scope = 'cron_DAILY_BIRTHDAY';

  await Promise.allSettled(
    guilds.map(async (guild) => {
      if (!guild.birthdayChannelId) return;

      try {
        const channel = await client.channels.fetch(guild.birthdayChannelId);
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
}

async function scheduleReminders(client: Client) {
  const scope = 'cron_DAILY_REMINDERS';
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
}
