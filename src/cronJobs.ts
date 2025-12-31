import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import cron from 'node-cron';
import {
  ButtonStyle,
  ChannelType,
  Client,
  ComponentType,
  TextChannel,
} from 'discord.js';

import { formatDateToString, getDaySuffix } from './utils/formatting.ts';
import { getAllBirthdaysInGuildForGivenDate } from './database/birthday.ts';
import {
  decayDumbScore,
  getAllGuilds,
  incrementDaysWithoutHumanParticipation,
  shouldBotWakeUpInServer,
  updateDumbScore,
} from './database/guild.ts';
import { getRemindersOfToday } from './database/reminders.ts';
import { logWithTime } from './utils/logging.ts';
import {
  humanParticipatedToday,
  STANDARD_COLOR,
  TIMES_MILISECONDS,
  todayWinners,
} from './utils/globals.ts';
import { getBotAction, getDefeatedMessage } from './utils/discord/todayis.ts';
import { scheduleReminder } from './utils/managers/reminderManager.ts';
import {
  getAllUsersCharsAndMessages,
  resetTodayIsPoints,
} from './database/user.ts';
import {
  generateGuildStatsImage,
  generateLeaderboard,
  prepareLeaderboardData,
} from './utils/generating.ts';
import {
  createButton,
  createButtonsRow,
  embedBuilder,
} from './utils/discord/embeds.ts';
import { resetAllUserStats } from './database/stats.ts';
import { sendUserStats } from './commands/stats.ts';

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
      logWithTime('Error in daily cron job:' + err, 'error', scope, true);
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
            logWithTime(
              `Failed to decay dumbscore in guild ${guild.guildId}: ${err}`,
              'error',
              scope,
            );
          }
        }),
      );
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
          // sent today is message for the servers that have a channel for it
          if (guild.todayIsChannelId) {
            try {
              const channel = await client.channels.fetch(
                guild.todayIsChannelId,
              );

              if (!channel || channel.type !== ChannelType.GuildText) return;

              await sendYearlyMessage(channel, guild.guildId, scope);

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
              logWithTime(
                `Failed to send 'Happy new Year' message in guild ${guild.guildId}: ${err}`,
                'error',
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

            const usersIds = (await discordGuild.members.fetch()).map(
              (m) => m.id,
            );

            if (!channel || channel.type !== ChannelType.GuildText) return;

            await sendYearlyStatsImage(
              channel,
              usersIds,
              discordGuild.iconURL({ extension: 'png' }),
              discordGuild.name,
              scope,
            );
          } catch (err: any) {
            logWithTime(
              `Failed to send yearly stats in guild ${guild.guildId}: ${err}`,
              'error',
              scope,
              true,
            );
          }
        }),
      );
      // reset all yearly stats of all users at the end
      await resetAllUserStats();
    } catch (err: any) {
      logWithTime('Error in yearly cron job:' + err, 'error', scope, true);
    }
  });

  cron.schedule('0 0 * * 1', () => {
    const scope = 'cron_WEEKLY';
    try {
      const logsDir = path.resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../logs',
      );
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
  // 200–3000 ms
  const randomDelay = Math.floor(Math.random() * 2801) + 200;

  // the delay below 0 happend once so this is just in case
  await new Promise((resolve) =>
    setTimeout(resolve, randomDelay < 0 ? 1500 : randomDelay),
  );

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
        }

        const wake = await shouldBotWakeUpInServer(guild.guildId);

        if (wake) {
          todayWinners[guild.guildId] = 'bot';
          const formattedDate = formatDateToString(new Date());
          const msg = `Today is ${formattedDate}, waited for ${randomDelay} ms`;
          await channel.send(msg);
          logWithTime(
            `Message sent in ${guild.guildId}: "${msg}"`,
            'info',
            scope,
          );
          await channel.send(`Where competition?`);
          logWithTime(
            `Message sent in ${guild.guildId}: "Where competition?"`,
            'info',
            scope,
          );
        } else {
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
            todayWinners[guild.guildId] = 'bot';
            const formattedDate = formatDateToString(new Date());
            const msg = `Today is ${formattedDate}, waited for ${randomDelay} ms`;
            await channel.send(msg);
            logWithTime(
              `Message sent in ${guild.guildId}: "${msg}"`,
              'info',
              scope,
            );
            await updateDumbScore(guild.guildId, false);
          }
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

async function sendYearlyMessage(
  channel: TextChannel,
  guildId: string,
  scope: string,
) {
  await channel.send(`🎆 Happy New Year!`);
  logWithTime(
    `Message sent in ${guildId}: "🎆 Happy New Year!"`,
    'info',
    scope,
  );
}

async function sendYearlyTodayIsLeaderboard(
  channel: TextChannel,
  guildId: string,
  scope: string,
  client: Client,
  reset: boolean,
) {
  const discordGuild = client.guilds.cache.get(guildId);

  if (!discordGuild) {
    logWithTime(
      `Guild with ID ${guildId} not found in client's cache.`,
      'error',
      scope,
      true,
    );
    return;
  }

  const memberIds = await discordGuild.members
    .fetch()
    .then((members) => members.map((m) => m.id));

  const users = await getAllUsersCharsAndMessages(memberIds);

  if (!users || users.length === 0) {
    return;
  }

  const completeUsers = await prepareLeaderboardData({
    users,
    client,
    number1Key: 'points',
    scope,
  });

  const image = await generateLeaderboard(
    completeUsers,
    scope,
    `Top 10 users of ${new Date().getFullYear() - 1}`,
  );

  const leaderboardEmbed = embedBuilder({
    title: `Today Is Leaderboard ${new Date().getFullYear() - 1}`,
    description: 'Top 10 users ranked by today-is points for the past year 🎆',
    color: STANDARD_COLOR,
    customize: (embed) => embed.setImage('attachment://leaderboard.png'),
  });

  await channel.send({
    embeds: [leaderboardEmbed],
    files: [image],
  });
  logWithTime(
    `Sent yearly todayIs leaderboard in guild ${guildId}`,
    'info',
    scope,
  );

  if (reset) {
    for (const user of users) {
      await resetTodayIsPoints(user.discordId);
    }
  }
}

async function sendYearlyStatsImage(
  channel: TextChannel,
  userIds: string[],
  imageURL: string | null,
  guildName: string,
  scope: string,
) {
  const image = await generateGuildStatsImage(userIds, imageURL, guildName);

  const guildStatsEmbed = embedBuilder({
    title: `Guild statistics`,
    description: `Here are the stats for **${guildName}** of ${new Date().getFullYear()}!`,
    color: STANDARD_COLOR,
    customize: (embed) => {
      embed.setImage('attachment://guild_stats.png');
      return embed;
    },
  });

  const button = createButton({
    type: 'view_self',
    label: 'View your stats!',
    style: ButtonStyle.Primary,
  });

  const msg = await channel.send({
    embeds: [guildStatsEmbed],
    components: [createButtonsRow([button])],
    files: [image],
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: TIMES_MILISECONDS.MINUTE * 2,
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  collector.on('collect', async (btnInteraction) => {
    await sendUserStats(btnInteraction);
  });

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  collector.on('end', async () => {
    try {
      await msg.edit({ components: [] });
    } catch (err: any) {
      logWithTime(
        `Could not edit message after collector ended: ${err}`,
        'warn',
        scope,
      );
    }
  });
}
