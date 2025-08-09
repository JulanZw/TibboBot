import { User } from 'discord.js';

import { logWithTime } from '../utils/logging';
import { prisma } from '../utils/constants';

export async function updateUserCharMsgCount(
  discordId: string,
  charCount: bigint,
  msgCount: number,
) {
  return await prisma.user.update({
    where: { discordId },
    data: { char_count: charCount, msg_count: msgCount },
  });
}

export async function insertUserData(
  discordId: string,
  charCount: bigint,
  msgCount: number,
  points: bigint = BigInt(0),
) {
  const newUser = await prisma.user.create({
    data: {
      discordId,
      char_count: charCount,
      msg_count: msgCount,
      points: points,
    },
  });
  return newUser;
}

export async function getAllUsersCharsAndMessages(userdIds?: string[]) {
  return await prisma.user.findMany({
    where: {
      char_count: { gt: BigInt(0) },
      msg_count: { gt: 0 },
      ...(userdIds ? { discordId: { in: userdIds } } : {}),
    },
    orderBy: { char_count: 'desc' },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true,
    },
  });
}

export async function getUserCharsAndMessages(id: string) {
  return await prisma.user.findUnique({
    where: { discordId: id },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true,
    },
  });
}

export async function getAllUsersDataTodayIs(userdIds?: string[]) {
  return await prisma.user.findMany({
    where: {
      points: { gt: BigInt(0) },
      ...(userdIds ? { discordId: { in: userdIds } } : {}),
    },
    orderBy: { points: 'desc' },
    take: 10,
    select: { discordId: true, points: true },
  });
}

export async function updateUserPoints(discordId: string, points: bigint) {
  const user = await prisma.user.update({
    where: { discordId },
    data: { points },
  });
  return user;
}

export async function getUserPoints(discordId: string) {
  return await prisma.user.findUnique({
    where: { discordId },
    select: { discordId: true, points: true },
  });
}

export async function setPointGiverOfGuild(
  guildId: string,
  pointGiverId: string,
) {
  let giver = await prisma.user.findUnique({
    where: { discordId: pointGiverId },
  });

  if (!giver) {
    giver = await insertUserData(pointGiverId, BigInt(0), 0);
  }

  await prisma.guild.update({
    where: { guildId },
    data: {
      pointGiver: {
        connect: { discordId: giver.discordId },
      },
    },
  });
}

export async function updateCountsForUser(author: User, content: string) {
  const userId = author.id;
  const messageLength = content.length;

  const user = await getUserCharsAndMessages(userId);

  if (user) {
    const newCharCount = user.char_count + BigInt(messageLength);
    const newMsgCount = user.msg_count + 1;
    await updateUserCharMsgCount(userId, newCharCount, newMsgCount);
    logWithTime(
      `Updated user messages and characters for ${author.id} [${author.username}]`,
      'info',
    );
  } else {
    await insertUserData(userId, BigInt(messageLength), 1);
    logWithTime(
      `Added new user for counting messages and characters for ${author.id} [${author.username}]`,
      'info',
    );
  }
}
