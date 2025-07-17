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

async function getUserData(id: string): Promise<{ discordId: string; char_count: number, msg_count: number; } | null> {
  return await prisma.user.findUnique({
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
  return await prisma.guild.findUnique({
    where: { guildId },
    select: { pointGiver: true }
  })
}

async function setPointGiverOfGuild(guildId: string, pointGiverId: string) {
  let giver = await prisma.user.findUnique({
    where: { discordId: pointGiverId },
  });

  if (!giver) {
    giver = await insertUserData(pointGiverId, 0, 0);
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

async function addGuild( guildId: string ) {
  return await prisma.guild.create({
    data: { guildId }
  });
}

async function getGuild( guildId: string ) {
  return await prisma.guild.findUnique({
    where: { guildId }
  });
}

async function setBirthday(guildId: string, userId: string, birthday: Date) {
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

async function getBirthday(guildId: string, userId: string) {
  return prisma.birthday.findUnique({
    where: {
      guildId_userId: {
        guildId,
        userId
      }
    }
  });
}

async function deleteBirthday(guildId: string, userId: string) {
  return prisma.birthday.delete({
    where: {
      guildId_userId: {
        guildId,
        userId
      }
    }
  });
}

async function getAllBirthdaysInGuild(guildId: string) {
  return prisma.birthday.findMany({
    where: { guildId },
    include: {
      user: true
    }
  });
}

async function getAllGuilds(){
  return prisma.guild.findMany();
}

export {
  getUserData,
  updateUserCharMsgCount,
  insertUserData,
  getAllUserData,
  getAllUserDataTodayIs,
  updateUserPoints,
  getUserPoints,
  setCountChannel,
  setTodayIsChannel,
  setBirthdayChannel,
  checkAndUpdateCount,
  getPointGiverOfGuild,
  setPointGiverOfGuild,
  addGuild,
  getGuild,
  setBirthday,
  getBirthday,
  deleteBirthday,
  getAllBirthdaysInGuild,
  getAllGuilds
};
