import { PrismaClient } from '@prisma/client';
import { User } from 'discord.js';

import { logWithTime } from './utils';

export const prisma = new PrismaClient();

//#region User

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

export async function getAllUsersCharsAndMessages() {
  return await prisma.user.findMany({
    where: { char_count: { gt: BigInt(0) }, msg_count: { gt: 0 } },
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

export async function getAllUsersDataTodayIs(): Promise<
  { discordId: string; points: bigint }[]
> {
  const rows = await prisma.user.findMany({
    where: { points: { gt: BigInt(0) } },
    orderBy: { points: 'desc' },
    take: 10,
    select: { discordId: true, points: true },
  });
  return rows;
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

//#endregion

//#region Guild

export type BotChannel = 'count' | 'today-is' | 'birthday';

export async function checkAndUpdateCount(
  guildId: string,
  providedNumber: number,
): Promise<boolean> {
  const guild = await prisma.guild.findUnique({
    where: { guildId },
    select: { countNumber: true },
  });

  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found.`);
  }

  const isCorrect = providedNumber === guild.countNumber + 1;

  await prisma.guild.update({
    where: { guildId },
    data: { countNumber: isCorrect ? providedNumber : 0 },
  });

  return isCorrect;
}

export async function getPointGiverIdOfGuild(guildId: string) {
  const pointGiver = await prisma.guild.findUnique({
    where: { guildId },
    select: { pointGiverId: true },
  });
  return pointGiver?.pointGiverId;
}

export async function addGuild(guildId: string) {
  return await prisma.guild.create({
    data: { guildId },
  });
}

export async function getGuild(guildId: string | null) {
  if (!guildId) return null;

  return await prisma.guild.findUnique({
    where: { guildId },
  });
}

export async function ensureGuildExistance(guildId: string) {
  const guild = await getGuild(guildId);
  return guild ? guild : await addGuild(guildId);
}

export async function getCountChannelOfGuild(guildId: string) {
  return prisma.guild.findUnique({
    where: { guildId },
    select: { countChannelId: true },
  });
}

export async function getLastCountUserAndHighestNumber(guildId: string) {
  const lastCountUser = await prisma.guild.findUnique({
    where: { guildId },
    select: { lastCountUser: true, highestNumber: true },
  });
  return lastCountUser;
}

export async function setLastCountUser(guildId: string, userId: string) {
  return await prisma.guild.update({
    where: { guildId },
    data: { lastCountUser: userId },
  });
}

export async function getAllGuilds() {
  return prisma.guild.findMany();
}

export function resetCount(guildId: string) {
  return prisma.guild.update({
    where: { guildId },
    data: {
      countNumber: 0,
      lastCountUser: null,
    },
  });
}

export async function updateBotChannel(
  guildId: string,
  channelType: BotChannel,
  channelId: string | null,
) {
  const updateData: {
    countChannelId?: string | null;
    todayIsChannelId?: string | null;
    birthdayChannelId?: string | null;
  } = {};

  switch (channelType) {
    case 'count':
      updateData.countChannelId = channelId;
      await setLastCountUser(guildId, '0');
      logWithTime(
        `Count channel updated to ${channelId} for guild ${guildId}`,
        'info',
      );
      break;
    case 'today-is':
      updateData.todayIsChannelId = channelId;
      logWithTime(
        `Today-is channel updated to ${channelId} for guild ${guildId}`,
        'info',
      );
      break;
    case 'birthday':
      updateData.birthdayChannelId = channelId;
      logWithTime(
        `Birthday channel updated to ${channelId} for guild ${guildId}`,
        'info',
      );
      break;
    default:
      return logWithTime(
        `Invalid channel type: ${channelType as BotChannel}`,
        'error',
        true,
      );
  }

  return await prisma.guild.update({
    where: { guildId },
    data: updateData,
  });
}

export async function getBotChannel(
  guildId: string,
  channelType: BotChannel,
): Promise<string | null> {
  const selectField: {
    countChannelId?: boolean;
    todayIsChannelId?: boolean;
    birthdayChannelId?: boolean;
  } = {};

  switch (channelType) {
    case 'count':
      selectField.countChannelId = true;
      break;
    case 'today-is':
      selectField.todayIsChannelId = true;
      break;
    case 'birthday':
      selectField.birthdayChannelId = true;
      break;
    default:
      logWithTime(
        `Invalid channel type: ${channelType as string}`,
        'error',
        true,
      );
      return null;
  }

  const guild = await prisma.guild.findUnique({
    where: { guildId },
    select: selectField,
  });

  if (!guild) return null;

  if (channelType === 'count') return guild.countChannelId ?? null;
  if (channelType === 'today-is') return guild.todayIsChannelId ?? null;
  if (channelType === 'birthday') return guild.birthdayChannelId ?? null;

  return null;
}

//#endregion

//#region Birthday

export async function setBirthday(
  guildId: string,
  userId: string,
  birthday: Date,
) {
  return prisma.birthday.upsert({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
    update: { birthday },
    create: {
      guildId,
      userId,
      birthday,
    },
  });
}

export async function getBirthday(guildId: string, userId: string) {
  return prisma.birthday.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
  });
}

export async function deleteBirthday(guildId: string, userId: string) {
  return prisma.birthday.delete({
    where: {
      guildId_userId: {
        guildId,
        userId,
      },
    },
  });
}

export async function getAllBirthdaysInGuildForGivenDate(
  guildId: string,
  date: Date,
) {
  const targetMonth = date.getUTCMonth();
  const targetDate = date.getUTCDate();

  const birthdays = await prisma.birthday.findMany({
    where: { guildId },
    include: { user: true },
  });

  return birthdays.filter((entry) => {
    const bday = new Date(entry.birthday);
    return (
      bday.getUTCMonth() === targetMonth && bday.getUTCDate() === targetDate
    );
  });
}

//#endregion

//#region Reaction Roles

export async function addReactionRole(
  guildId: string,
  messageId: string,
  channelId: string,
  emoji: string,
  roleId: string,
) {
  return await prisma.reactionRoles.create({
    data: {
      guildId,
      messageId,
      channelId,
      emoji,
      role: roleId,
    },
  });
}

export async function getRoleForReaction(
  guildId: string,
  messageId: string,
  emoji: string,
) {
  return await prisma.reactionRoles.findUnique({
    where: {
      guildId_messageId_emoji: {
        guildId,
        messageId,
        emoji,
      },
    },
  });
}

export async function getReactionRolesByMessage(messageId: string) {
  return await prisma.reactionRoles.findMany({
    where: { messageId },
  });
}

export async function removeReactionRolesByMessageId(messageId: string) {
  return await prisma.reactionRoles.deleteMany({
    where: { messageId },
  });
}

export async function deleteReactionRolesByMessage(messageId: string) {
  return await prisma.reactionRoles.deleteMany({
    where: {
      messageId,
    },
  });
}

export async function deleteReactionRole(
  guildId: string,
  messageId: string,
  emoji: string,
) {
  return await prisma.reactionRoles.delete({
    where: {
      guildId_messageId_emoji: {
        guildId,
        messageId,
        emoji,
      },
    },
  });
}

//#endregion

//#region Reminder

export async function createReminder(
  userId: string,
  message: string,
  remindAt: Date,
) {
  return await prisma.reminders.create({
    data: {
      userId,
      message,
      remindAt,
      createdAt: new Date(),
    },
  });
}

export async function getUserReminders(userId: string) {
  return await prisma.reminders.findMany({
    where: { userId },
    orderBy: { remindAt: 'asc' },
  });
}

export async function getReminderById(id: string) {
  return await prisma.reminders.findUnique({
    where: { id },
  });
}

export async function getDueReminders(until: Date) {
  return await prisma.reminders.findMany({
    where: {
      remindAt: {
        lte: until,
      },
    },
  });
}

export async function getRemindersBetween(start: Date, end: Date) {
  return await prisma.reminders.findMany({
    where: {
      remindAt: {
        gte: start,
        lt: end,
      },
    },
  });
}

export async function getRemindersOfToday() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 1);
  return await getRemindersBetween(start, end);
}

export async function updateReminder(
  id: string,
  message: string,
  remindAt: Date,
) {
  return await prisma.reminders.update({
    where: { id },
    data: { message, remindAt },
  });
}

export async function deleteReminder(id: string) {
  await prisma.reminders.delete({
    where: { id },
  });
}
