import { PrismaClient } from '@prisma/client';
import { logWithTime } from './utils';

const prisma = new PrismaClient();

async function updateUserCharMsgCount(discordId: string, charCount: number, msgCount: number) {
  return await prisma.user.update({
    where: { discordId },
    data: { char_count: charCount, msg_count: msgCount }
  });
}

async function insertUserData(discordId: string, charCount: number, msgCount: number, points: number = 0) {
  const newUser = await prisma.user.create({
    data: {
      discordId,
      char_count: charCount,
      msg_count: msgCount,
      points: points,
    }
  });
  logWithTime(`Inserted new data for user ${discordId}: char_count = ${charCount}, msg_count = ${msgCount}`);
  return newUser;
}

async function getAllUserData(): Promise<{ discordId: string; char_count: number, msg_count: number; }[]> {
  return await prisma.user.findMany({
    orderBy: { char_count: 'desc' },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true
    }
  });
}

async function getUserData(id: string): Promise<{ discordId: string; char_count: number, msg_count: number; }> {
  return await prisma.user.findUique({
    where: { discordId: id },
    select: {
      discordId: true,
      char_count: true,
      msg_count: true
    }
  });
}

async function getAllUserDataTodayIs(): Promise<{ discordId: string; points: number; }[]> {
  const rows = await prisma.user.findMany({
    orderBy: { points: 'desc' },
    take: 10,
    select: { discordId: true, points: true }
    
  });
  logWithTime('Pointboard requested');
  return rows;
}

async function updateUserPoints(discordId: string, points: number, interaction: any) {
  const user = await prisma.user.update({
    where: { discordId },
    data: { points }
  });
  logWithTime(`Added points for user ${discordId} (${interaction.options.getUser('target').username}): points added = ${points}`);
  return user;
}

async function getUserPoints(discordId: string) {
  return await prisma.user.findUnique({
    where: { discordId },
    select: { discordId: true, points: true }
  });
}

async function getBirthday(date: Date) {
  return await prisma.user.findMany({
    where: {
      birthday: date
    },
    select: { discordId: true }
  });
}

async function addBirthday(discordId: string, date: string) {
  const birthdayDate = new Date(date);
  const user = await prisma.user.update({
    where: { discordId },
    data: { birthday: birthdayDate }
  });
  logWithTime(`Inserted new birthday for user ${discordId}: birthday = ${date}`);
  return user;
}

async function setCountChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { countChannelId: channelId },
    create: {
      guildId,
      countChannelId: channelId,
    }
  });
}

async function setTodayIsChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { todayIsChannelId: channelId },
    create: {
      guildId,
      todayIsChannelId: channelId,
    }
  });
}

async function setBirthdayChannel(guildId: string, channelId: string) {
  return await prisma.guild.upsert({
    where: { guildId },
    update: { birthdayChannelId: channelId },
    create: {
      guildId,
      birthdayChannelId: channelId,
    }
  });
}

async function getAllTodayIsChannels(){
  return await prisma.guild.findMany({
    select: { todayIsChannelId: true }
  });
}

async function checkAndUpdateCount(guildId: string, providedNumber: number): Promise<boolean> {
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

async function getPointGiverOfGuild(guildId: string){
  const giver = await prisma.guild.findUnique({
    where: { guildId },
    select: { pointGiver: true }
  })
}

export {
  getUserData,
  updateUserCharMsgCount,
  insertUserData,
  getAllUserData,
  getAllUserDataTodayIs,
  updateUserPoints,
  getUserPoints,
  getBirthday,
  addBirthday,
  setCountChannel,
  setTodayIsChannel,
  setBirthdayChannel,
  checkAndUpdateCount,
  getAllTodayIsChannels,
  getPointGiverOfGuild
};
