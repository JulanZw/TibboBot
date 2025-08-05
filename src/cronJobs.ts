/* eslint-disable @typescript-eslint/no-misused-promises */
import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';

import {
  formatDate,
  getDateKey,
  getDaySuffix as getSuffix,
  logWithTime,
  reminderDaysCache,
  sourceRequestTracker,
} from './utils';
import {
  deleteReminder,
  getAllBirthdaysInGuildForGivenDate,
  getAllGuilds,
  getRemindersBetween,
} from './database';

export function setupCronJobs(client: Client): void {
  cron.schedule('0 0 * * *', async () => {
    try {
      const randomDelay = Math.floor(Math.random() * 2801) + 200; // 0–3000 ms

      await new Promise((resolve) =>
        setTimeout(resolve, randomDelay < 0 ? 1500 : randomDelay),
      ); // the delay below 0 happend once so this is just in case

      const guilds = await getAllGuilds();
      const formattedDate = formatDate(new Date());

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
              );
              return;
            }

            await channel.send(
              `Today is ${formattedDate}, waited for ${randomDelay} ms`,
            );
            logWithTime(
              `Message sent in ${guild.guildId}: "Today is ${formattedDate}"`,
              'info',
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send 'today is' message in guild ${guild.guildId}: ${err}`,
              'error',
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
                  `Congratulations with your ${birthdayYear + getSuffix(birthdayYear)} birthday <@${birthday.userId}> 🎉!`,
                );
                logWithTime(
                  `Message send in ${birthday.guildId}: "Happy Birthday <@${birthday.userId}>!"`,
                  'info',
                );
              }),
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send birthday messages in guild ${guild.guildId}: ${err}`,
              'error',
              true,
            );
          }
        }),
      );

      // Rebuild reminder cache
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 1);

      const upcomingReminders = await getRemindersBetween(start, end);

      reminderDaysCache.clear();
      for (const reminder of upcomingReminders) {
        const dateKey = getDateKey(reminder.remindAt);

        if (!reminderDaysCache.has(dateKey)) {
          reminderDaysCache.set(dateKey, []);
        }

        reminderDaysCache.get(dateKey)!.push(reminder);
      }

      // Reset sourceRequestTracker
      sourceRequestTracker.clear();
    } catch (err: any) {
      logWithTime('Error in daily cron job:' + err, 'error', true);
    }
  });

  cron.schedule('0 0 1 1 *', async () => {
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
                true,
              );
              return;
            }

            await channel.send(`🎆 Happy New Year!`);
            logWithTime(
              `Message sent in ${guild.guildId}: "🎆 Happy New Year!"`,
              'info',
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send 'Happy new Year' message in guild ${guild.guildId}: ${err}`,
              'error',
              true,
            );
          }
        }),
      );
    } catch (err: any) {
      logWithTime('Error in yearly cron job:' + err, 'error', true);
    }
  });

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const todayKey = getDateKey(now);
      const reminders = reminderDaysCache.get(todayKey);
      if (!reminders) return;

      const due = reminders.filter((r) => r.remindAt <= now);

      await Promise.allSettled(
        due.map(async (reminder) => {
          try {
            const user = await client.users.fetch(reminder.userId);
            await user.send(`**Reminder:** ${reminder.message}`);
          } catch (err: any) {
            logWithTime('Failed to send reminder: ' + err, 'error', true);
          }
          await deleteReminder(reminder.id);

          const index = reminders.indexOf(reminder);
          if (index !== -1) reminders.splice(index, 1);
        }),
      );
    } catch (err: any) {
      logWithTime(
        'Something went wrong while sending reminders' + err,
        'error',
        true,
      );
    }
  });

  logWithTime('Cron jobs have been set up successfully.', 'info');
}
