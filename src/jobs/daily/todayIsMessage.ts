import { formatDateToString } from '@julanzw/ttoolbox-discordjs-framework';
import { Client, TextChannel } from 'discord.js';

import {
  getAllGuilds,
  shouldBotWakeUpInServer,
  updateDumbScore,
} from '../../database/guild.ts';
import { logger } from '../../index.ts';
import { todayWinners } from '../../utils/globals.ts';
import { getDefeatedMessage, getBotAction } from '../../utils/todayis.ts';

export async function runTodayIsMessages(
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
          logger.error(
            `Channel for guild ${guild.guildId} not found or not text-based.`,
            scope,
          );
          return;
        }

        if (todayWinners[guild.guildId]) {
          const message = getDefeatedMessage(guild.dumbScore);
          await channel.send(message);
          logger.info(`Message sent in ${guild.guildId}: "${message}"`, scope);
          return;
        }

        const wake = await shouldBotWakeUpInServer(guild.guildId);

        if (wake) {
          todayWinners[guild.guildId] = 'bot';
          const formattedDate = formatDateToString(new Date());
          const msg = `Today is ${formattedDate}, waited for ${randomDelay} ms`;
          await channel.send(msg);
          logger.info(`Message sent in ${guild.guildId}: "${msg}"`, scope);
          await channel.send(`Where competition?`);
          logger.info(
            `Message sent in ${guild.guildId}: "Where competition?"`,
            scope,
          );
        } else {
          const botAction = getBotAction(guild.dumbScore);
          if (botAction.type === 'skip') {
            await channel.send(botAction.answer);
            logger.info(
              `Skipping 'Today is' message in guild ${guild.guildId}: ${botAction.answer}`,
              scope,
            );
            return;
          } else if (botAction.type === 'funny') {
            await channel.send(botAction.answer);
            logger.info(
              `Sending funny 'Today is' message in guild ${guild.guildId}: ${botAction.answer}`,
              scope,
            );
            return;
          } else {
            todayWinners[guild.guildId] = 'bot';
            const formattedDate = formatDateToString(new Date());
            const msg = `Today is ${formattedDate}, waited for ${randomDelay} ms`;
            await channel.send(msg);
            logger.info(`Message sent in ${guild.guildId}: "${msg}"`, scope);
            await updateDumbScore(guild.guildId, false);
          }
        }
      } catch (err: any) {
        logger.error(
          `Failed to send 'today is' message in guild ${guild.guildId}: ${err}`,
          scope,
        );
      }
    }),
  );
}
