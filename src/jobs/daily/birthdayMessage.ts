import { getDaySuffix } from '@julanzw/ttoolbox-discordjs-framework';
import { Client, TextChannel } from 'discord.js';

import { getAllBirthdaysInGuildForGivenDate } from '../../database/birthday.ts';
import { getAllGuilds } from '../../database/guild.ts';
import { logger } from '../../index.ts';

export async function runBirthdayMessages(
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
          logger.error(
            `Birthday channel in guild ${guild.guildId} not found or not text-based.`,
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
            logger.info(
              `Message send in ${birthday.guildId}: "Happy Birthday <@${birthday.userId}>!"`,
              scope,
            );
          }),
        );
      } catch (err: any) {
        logger.error(
          `Failed to send birthday messages in guild ${guild.guildId}: ${err}`,
          scope,
          true,
        );
      }
    }),
  );
}
