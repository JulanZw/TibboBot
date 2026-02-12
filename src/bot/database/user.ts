import { User } from 'discord.js';

import { prisma } from '../utils/globals.ts';
import { hasOptedOut } from '../utils/managers/optInOutManager.ts';
import { logWithTime } from '../../core/utils/logging.ts';

const scope = 'database_USER';

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
  optedout?: boolean,
) {
  const newUser = await prisma.user.create({
    data: {
      discordId,
      char_count: charCount,
      msg_count: msgCount,
      points,
      optedout,
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
      optedout: false,
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
      optedout: false,
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
  if (hasOptedOut(userId)) return;
  const messageLength = content.length;

  const user = await getUserCharsAndMessages(userId);

  if (user) {
    const newCharCount = user.char_count + BigInt(messageLength);
    const newMsgCount = user.msg_count + 1;
    await updateUserCharMsgCount(userId, newCharCount, newMsgCount);
    logWithTime(
      `Updated user messages and characters for ${author.id} [${author.username}]`,
      'info',
      scope,
    );
  } else {
    await insertUserData(userId, BigInt(messageLength), 1);
    logWithTime(
      `Added new user for counting messages and characters for ${author.id} [${author.username}]`,
      'info',
      scope,
    );
  }
}

export async function deleteUser(discordId: string) {
  await prisma.user.delete({
    where: { discordId },
  });
}

export async function getUser(discordId: string) {
  return await prisma.user.findUnique({
    where: { discordId },
  });
}

export async function updateOptOutChoice(discordId: string, choice: boolean) {
  return await prisma.user.update({
    where: { discordId },
    data: { optedout: choice },
  });
}

export async function getOptedOutUsers() {
  return await prisma.user.findMany({
    where: { optedout: true },
  });
}

export async function resetTodayIsPoints(discordId: string) {
  return await prisma.user.update({
    where: { discordId },
    data: { points: BigInt(0) },
  });
}
