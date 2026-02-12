import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder, Client } from 'discord.js';

import { PrepareLeaderboardOptions } from '../types/leaderboard.ts';
import {
  getTotalOfMultipleUserStats,
  getUserStats,
} from '../database/stats.ts';
import { UserStatistics } from '../types/stats.ts';
import { logWithTime } from '../../core/utils/logging.ts';

async function getUserAvatarAndName(
  userId: string,
  client: Client,
): Promise<{
  displayName: string;
  avatar: string | null;
}> {
  try {
    const user = await client.users.fetch(userId);
    const displayName = user.displayName ?? user.username;
    const avatar = user.displayAvatarURL({ extension: 'png' });
    return {
      displayName,
      avatar,
    };
  } catch (err: any) {
    logWithTime(
      `Error fetching user: ${err}`,
      'error',
      'prepareUserDataStats',
      true,
    );
    return {
      displayName: 'Unknown User',
      avatar: null,
    };
  }
}

/**
 * Generates a leaderboard image using Canvas and returns it as an AttachmentBuilder.
 * @param users An array of user objects containing username, number1, optional number2, and optional avatar URL.
 * @param scope A string representing the scope of the leaderboard (e.g., "today-is", "messages").
 * @param customText Optional custom text to display as the title of the leaderboard.
 * @return An AttachmentBuilder containing the generated leaderboard image. The file name is `leaderboard.png`.
 */
export async function generateLeaderboard(
  users: {
    username: string;
    number1: bigint;
    number2?: bigint;
    avatar?: string | null;
  }[],
  scope: string,
  customText?: string,
) {
  const width = 900;
  const height = 100 + Math.min(users.length, 10) * 60;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Sans';
  ctx.fillText(customText ? customText : 'Leaderboard', width / 2 - 150, 50);

  const allPoints: number[] = [];
  for (const u of users) {
    allPoints.push(Number(u.number1));
    if (u.number2 != null) allPoints.push(Number(u.number2));
  }
  const maxPoints = Math.max(...allPoints);
  const barMaxWidth = 500;

  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const user = users[i];
    const y = 100 + i * 60;

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(50, y + 20, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    if (user.avatar) {
      try {
        const avatar = await loadImage(user.avatar);
        ctx.drawImage(avatar, 30, y, 40, 40);
      } catch {
        logWithTime(
          `Avatar failed to load for user: ${user.username} while building leaderboard`,
          'warn',
          scope,
        );
      }
    }
    ctx.restore();

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Sans';
    ctx.fillText(user.username, 90, y + 28);

    // First bar
    const barWidth1 = (Number(user.number1) / maxPoints) * barMaxWidth;
    ctx.fillStyle = '#3F48CC';
    ctx.fillRect(300, y + 5, barWidth1, user.number2 ? 15 : 30);

    // Points text for number1
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Sans';
    ctx.fillText(
      `${user.number1}`,
      310 + barWidth1,
      y + (user.number2 ? 18 : 25),
    );

    // Second bar (if needed)
    if (user.number2) {
      const barWidth2 = (Number(user.number2) / maxPoints) * barMaxWidth;
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(300, y + 22, barWidth2, 15);

      // Points text for number2
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${user.number2}`, 310 + barWidth2, y + 35);
    }
  }

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'leaderboard.png' });
}

/**
 * Fetches user data and prepares it for the `generateLeaderboard` function.
 *
 * It has the following options:
 * @param {Object[]} users - Array of user records to process
 * @param {Object} client - Discord client instance for fetching user data
 * @param {string} number1Key - Key for the primary number to display
 * @param {string} [number2Key] - Optional key for the secondary number to display
 * @param {number} [limit=10] - Maximum number of users to include
 * @param {boolean} [includeRankInUsername=true] - Whether to prefix usernames with ranks
 * @param {string} [scope='leaderboard'] - Scope identifier for logging
 * @returns an array of user data objects formatted for leaderboard display
 */
export async function prepareLeaderboardData({
  users,
  client,
  number1Key,
  number2Key,
  limit = 10,
  includeRankInUsername = true,
  scope = 'leaderboard',
}: PrepareLeaderboardOptions): Promise<
  {
    username: string;
    number1: bigint;
    number2?: bigint;
    avatar: string | null;
  }[]
> {
  return await Promise.all(
    users.slice(0, limit).map(async (row, index) => {
      try {
        const { displayName, avatar } = await getUserAvatarAndName(
          row.discordId,
          client,
        );
        const rank = includeRankInUsername ? `${index + 1}. ` : '';

        const entry: {
          username: string;
          number1: bigint;
          number2?: bigint;
          avatar: string | null;
        } = {
          username: `${rank}${displayName}`,
          number1: BigInt(row[number1Key]),
          avatar,
        };

        if (number2Key) {
          entry.number2 = BigInt(row[number2Key]);
        }

        return entry;
      } catch (err: any) {
        logWithTime(`Error fetching user: ${err}`, 'error', scope, true);

        const rank = includeRankInUsername ? `${index + 1}. ` : '';
        const entry: {
          username: string;
          number1: bigint;
          number2?: bigint;
          avatar: string | null;
        } = {
          username: `${rank}Unknown User`,
          number1: BigInt(row[number1Key]),
          avatar: null,
        };

        if (number2Key) {
          entry.number2 = BigInt(row[number2Key]);
        }

        return entry;
      }
    }),
  );
}

async function buildStatsImage({
  title,
  avatarUrl,
  stats,
  filename,
  logScope,
}: {
  title: string;
  avatarUrl?: string | null;
  stats: UserStatistics;
  filename: string;
  logScope: string;
}): Promise<AttachmentBuilder> {
  const width = 700;
  const height = 250;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#ffffff';

  const maxLen36px = 21;
  const maxLen24px = 28;
  let lines;

  if (title.length > maxLen36px) {
    lines = splitToLines(title, maxLen24px);
  } else {
    lines = [title];
  }

  if (lines.length > 1) {
    ctx.font = 'bold 24px Sans';
    if (lines.length === 2) {
      ctx.fillText(lines[0], 130, 50);
      ctx.fillText(lines[1], 130, 80);
    } else {
      ctx.fillText(lines[0], 130, 40);
      ctx.fillText(lines[1], 130, 70);
      ctx.fillText(lines[2], 130, 100);
    }
  } else {
    ctx.font = 'bold 36px Sans';
    ctx.fillText(lines[0], 130, 70);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(70, 60, 50, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  // Avatar
  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.drawImage(img, 20, 10, 100, 100);
    } catch {
      logWithTime(
        `Icon failed to load while building stats image`,
        'warn',
        logScope,
      );
    }
  }
  ctx.restore();

  const xValueFirstColumn = 25;
  const xValueSecondColumn = 400;
  const yValueFirstRow = 150;
  const yValueSecondRow = 190;
  const yValueThirdRow = 230;

  // Stats text
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Sans';
  ctx.fillText(
    `Total Characters Sent: ${stats.charsSentThisYear}`,
    xValueFirstColumn,
    yValueFirstRow,
  );
  ctx.fillText(
    `Total Messages Sent: ${stats.messagesSentThisYear}`,
    xValueSecondColumn,
    yValueFirstRow,
  );
  ctx.fillText(
    `Total Today-is Participations: ${stats.todayIsParticipationDays}`,
    xValueFirstColumn,
    yValueSecondRow,
  );
  ctx.fillText(
    `Total Today Is Wins: ${stats.todayIsWins}`,
    xValueSecondColumn,
    yValueSecondRow,
  );
  ctx.fillText(
    `Total Reminders Set: ${stats.remindersSet}`,
    xValueFirstColumn,
    yValueThirdRow,
  );
  ctx.fillText(
    `Total Cats Requested: ${stats.catsRequested}`,
    xValueSecondColumn,
    yValueThirdRow,
  );

  return new AttachmentBuilder(canvas.toBuffer(), { name: filename });
}

export async function generateGuildStatsImage(
  userIds: string[],
  guildImageUrl: string | null,
  name: string,
): Promise<AttachmentBuilder> {
  const totalStats = await getTotalOfMultipleUserStats(userIds);

  return buildStatsImage({
    title: `Stats for ${name}`,
    avatarUrl: guildImageUrl,
    stats: totalStats,
    filename: 'guild_stats.png',
    logScope: 'guild-stats',
  });
}

export async function generateUserStatsImage(
  userId: string,
  client: Client,
): Promise<AttachmentBuilder> {
  const totalStats = await getUserStats(userId);
  const { displayName, avatar } = await getUserAvatarAndName(userId, client);

  return buildStatsImage({
    title: `Stats of ${displayName}`,
    avatarUrl: avatar,
    stats: totalStats,
    filename: 'user_stats.png',
    logScope: 'user-stats',
  });
}

function splitToLines(title: string, max: number) {
  const words = title.split(' ');
  const lines: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.length) {
      lines.push(current);
      current = '';
    }
  };

  for (let word of words) {
    if (word.length > max) {
      pushCurrent();
      while (word.length > max) {
        lines.push(word.slice(0, max));
        word = word.slice(max);
      }
      if (word) current = word;
    } else if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= max) {
      current += ' ' + word;
    } else {
      pushCurrent();
      current = word;
    }
    if (lines.length >= 3) break;
  }
  if (lines.length < 3) pushCurrent();
  return lines.slice(0, 3);
}
