import { PrismaClient } from '@prisma/client';
import { logWithTime } from './utils';
import { User } from 'discord.js';

export const prisma = new PrismaClient();

//#region User

export async function updateUserCharMsgCount(discordId: string, charCount: bigint, msgCount: number) {
  return await prisma.user.update({
    where: { discordId },
    data: { char_count: charCount, msg_count: msgCount }
  });
}

export async function insertUserData(discordId: string, charCount: bigint, msgCount: number, points: bigint = BigInt(0)) {
  const newUser = await prisma.user.create({
    data: {
      discordId,
      char_count: charCount,
      msg_count: msgCount,
      points: points,
    }
  });
  return newUser;
}

export async function getAllUserData() {
  return await prisma.user.findMany({
    orderBy: { char_count: 'desc' },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true
    }
  });
}

export async function getUserData(id: string) {
  return await prisma.user.findUnique({
    where: { discordId: id },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true
    }
  });
}

export async function getAllUserDataTodayIs(): Promise<{ discordId: string; points: bigint; }[]> {
  const rows = await prisma.user.findMany({
    orderBy: { points: 'desc' },
    take: 10,
    select: { discordId: true, points: true }
    
  });
  return rows;
}

export async function updateUserPoints(discordId: string, points: bigint, interaction: any) {
  const user = await prisma.user.update({
    where: { discordId },
    data: { points }
  });
  return user;
}

export async function getUserPoints(discordId: string) {
  return await prisma.user.findUnique({
    where: { discordId },
    select: { discordId: true, points: true }
  });
}

export async function setPointGiverOfGuild(guildId: string, pointGiverId: string) {
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
        connect: { discordId: giver.discordId }
      }
    }
  });
}

export async function updateCountsForUser(author: User, content: string){
  const userId = author.id;
	const messageLength = content.length;

  const user = await getUserData(userId);

  if (user) {
    const newCharCount = user.char_count + BigInt(messageLength);
    const newMsgCount = user.msg_count + 1;
    await updateUserCharMsgCount(userId, newCharCount, newMsgCount);
    logWithTime(`Updated user messages and characters for ${author.id} [${author.username}]`,'info');
  } else {
    await insertUserData(userId, BigInt(messageLength), 1);
    logWithTime(`Added new user for counting messages and characters for ${author.id} [${author.username}]`,'info');
  }
}

//#endregion

//#region Guild

export async function setCountChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { countChannelId: channelId },
    create: {
      guildId,
      countChannelId: channelId,
    }
  });
}

export async function setTodayIsChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { todayIsChannelId: channelId },
    create: {
      guildId,
      todayIsChannelId: channelId,
    }
  });
}

export async function setBirthdayChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { birthdayChannelId: channelId },
    create: {
      guildId,
      birthdayChannelId: channelId,
    }
  });
}

export async function checkAndUpdateCount(guildId: string, providedNumber: number): Promise<boolean> {
  const guild = await prisma.guild.findUnique({
    where: { guildId },
    select: { countNumber: true }
  });

  if (!guild) {
    throw new Error(`Guild with ID ${guildId} not found.`);
  }

  const isCorrect = providedNumber === guild.countNumber + 1;

  await prisma.guild.update({
    where: { guildId },
    data: { countNumber: isCorrect ? providedNumber : 0 }
  });

  return isCorrect;
}

export async function getPointGiverIdOfGuild(guildId: string){
  const pointGiver = await prisma.guild.findUnique({
    where: { guildId },
    select: { pointGiverId: true }
  })
  return pointGiver?.pointGiverId
}

export async function addGuild( guildId: string ) {
  return await prisma.guild.create({
    data: { guildId }
  });
}

export async function getGuild( guildId: string ) {
  return await prisma.guild.findUnique({
    where: { guildId }
  });
}

export async function getCountChannelOfGuild(guildId: string){
  return prisma.guild.findUnique({
    where: { guildId },
    select: { countChannelId: true }
  })
}

export async function getLastCountUser(guildId: string){
  const lastCountUser = await prisma.guild.findUnique({
    where: { guildId },
    select: { lastCountUser: true }
  })
  return lastCountUser?.lastCountUser;
}

export async function getAllGuilds(){
  return prisma.guild.findMany();
}

//#endregion

//#region Birthday

export async function setBirthday(guildId: string, userId: string, birthday: Date) {
  return prisma.birthday.upsert({
    where: {
      guildId_userId: {
        guildId,
        userId
      }
    },
    update: { birthday },
    create: {
      guildId,
      userId,
      birthday
    }
  });
}

export async function getBirthday(guildId: string, userId: string) {
  return prisma.birthday.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId
      }
    }
  });
}

export async function deleteBirthday(guildId: string, userId: string) {
  return prisma.birthday.delete({
    where: {
      guildId_userId: {
        guildId,
        userId
      }
    }
  });
}

export async function getAllBirthdaysInGuildForGivenDate(guildId: string, date: Date) {
  const targetMonth = date.getUTCMonth();
  const targetDate = date.getUTCDate();

  const birthdays = await prisma.birthday.findMany({
    where: { guildId },
    include: { user: true }
  });

  return birthdays.filter(entry => {
    const bday = new Date(entry.birthday);
    return (
      bday.getUTCMonth() === targetMonth &&
      bday.getUTCDate() === targetDate
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
  roleId: string
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
  emoji: string
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
  emoji: string
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

export async function createReminder(userId: string, message: string, remindAt: Date) {
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
    orderBy: { remindAt: "asc" },
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
        lt: end
      }
    },
  });
}

export async function updateReminder(id: string, message: string, remindAt: Date){
  return await prisma.reminders.update({
    where: { id },
    data: { message, remindAt }
  });
}

export async function deleteReminder(id: string) {
  await prisma.reminders.delete({
    where: { id },
  });
}
