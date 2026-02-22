import { embedBuilder } from '@julanzw/ttoolbox-discordjs-framework';
import { TextChannel, Client } from 'discord.js';

import {
  getAllUsersDataTodayIs,
  resetTodayIsPoints,
} from '../../database/user.ts';
import { logger } from '../../index.ts';
import {
  prepareLeaderboardData,
  generateLeaderboard,
} from '../../utils/generating.ts';
import { STANDARD_COLOR } from '../../utils/globals.ts';

export async function sendYearlyTodayIsLeaderboard(
  channel: TextChannel,
  guildId: string,
  scope: string,
  client: Client,
  reset: boolean,
) {
  const discordGuild = client.guilds.cache.get(guildId);

  if (!discordGuild) {
    logger.error(
      `Guild with ID ${guildId} not found in client's cache.`,
      scope,
      true,
    );
    return;
  }

  const memberIds = await discordGuild.members
    .fetch()
    .then((members) => members.map((m) => m.id));

  const users = await getAllUsersDataTodayIs(memberIds);

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
  logger.info(`Sent yearly todayIs leaderboard in guild ${guildId}`, scope);

  if (reset) {
    for (const user of users) {
      if (user.points !== BigInt(0)) {
        await resetTodayIsPoints(user.discordId);
      }
    }
  }
}
