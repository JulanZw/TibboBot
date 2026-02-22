import cron from 'node-cron';
import { ChannelType, Client } from 'discord.js';

import {
  decayDumbScore,
  getAllGuilds,
  incrementDaysWithoutHumanParticipation,
} from './database/guild.ts';
import { humanParticipatedToday } from './utils/globals.ts';
import { resetAllUserStats } from './database/stats.ts';
import { logger } from './index.ts';
import { runBirthdayMessages } from './jobs/daily/birthdayMessage.ts';
import { scheduleReminders } from './jobs/daily/scheduleReminders.ts';
import { runTodayIsMessages } from './jobs/daily/todayIsMessage.ts';
import { sendYearlyStatsImage } from './jobs/yearly/stats.ts';
import { sendYearlyTodayIsLeaderboard } from './jobs/yearly/todayIsLeaderboard.ts';

export function setupCronJobs(client: Client): void {
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('0 0 * * *', async () => {
    const scope = 'cron_DAILY_START';
    try {
      const guilds = await getAllGuilds();
      await runTodayIsMessages(client, guilds);
      await runBirthdayMessages(client, guilds);
      await scheduleReminders(client);
    } catch (err: any) {
      logger.error('Error in daily cron job:' + err, scope, true);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('59 23 * * *', async () => {
    const scope = 'cron_DAILY_END';
    try {
      const guilds = await getAllGuilds();
      await Promise.allSettled(
        guilds.map(async (guild) => {
          if (!guild.todayIsChannelId) return;

          try {
            await decayDumbScore(guild.guildId);
            if (!humanParticipatedToday.includes(guild.guildId)) {
              await incrementDaysWithoutHumanParticipation(guild.guildId);
            }
          } catch (err: any) {
            logger.error(
              `Failed to decay dumbscore in guild ${guild.guildId}: ${err}`,
              scope,
            );
          }
        }),
      );
    } catch (err: any) {
      logger.error('Error in daily cron job:' + err, scope, true);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  cron.schedule('0 0 1 1 *', async () => {
    const scope = 'cron_YEARLY';
    try {
      const guilds = await getAllGuilds();

      await Promise.allSettled(
        guilds.map(async (guild) => {
          // sent today is message for the servers that have a channel for it
          if (guild.todayIsChannelId) {
            try {
              const channel = await client.channels.fetch(
                guild.todayIsChannelId,
              );

              if (!channel || channel.type !== ChannelType.GuildText) return;

              await channel.send(`🎆 Happy New Year!`);
              logger.info(
                `Message sent in ${guild.guildId}: "🎆 Happy New Year!"`,
                scope,
              );

              if (guild.yearlyTodayIsReset === true) {
                await sendYearlyTodayIsLeaderboard(
                  channel,
                  guild.guildId,
                  scope,
                  client,
                  guild.yearlyTodayIsReset,
                );
              }
            } catch (err: any) {
              logger.error(
                `Failed to send 'Happy new Year' message in guild ${guild.guildId}: ${err}`,
                scope,
                true,
              );
            }
          }

          // sent stats to a guild if they have either a publicUpdatesChannel or a todayIsChannel
          try {
            const discordGuild = await client.guilds.fetch(guild.guildId);
            let channel;
            if (discordGuild.publicUpdatesChannel) {
              channel = discordGuild.publicUpdatesChannel;
            } else if (guild.todayIsChannelId) {
              channel = await client.channels.fetch(guild.todayIsChannelId);
            }

            const usersIds = discordGuild.members.cache.map((m) => m.id);

            if (!channel || channel.type !== ChannelType.GuildText) {
              return;
            }

            await sendYearlyStatsImage(
              channel,
              usersIds,
              discordGuild.iconURL({ extension: 'png' }),
              discordGuild.name,
              scope,
            );
          } catch (err: any) {
            logger.error(
              `Failed to send yearly stats in guild ${guild.guildId}: ${err}`,
              scope,
              true,
            );
          }
        }),
      );
      // reset all yearly stats of all users at the end
      await resetAllUserStats();
    } catch (err: any) {
      logger.error('Error in yearly cron job:' + err, scope, true);
    }
  });

  cron.schedule('0 0 * * 1', () => {
    const scope = 'cron_WEEKLY';
    try {
      logger.rotate();
    } catch (err: any) {
      logger.error('Error in weekly log rotation: ' + err, scope, true);
    }
  });

  logger.info('Cron jobs have been set up successfully.', 'startup', true);
}
