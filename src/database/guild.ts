import { logWithTime } from '../utils/logging';
import { BotChannel } from '../utils/typesAndInterfaces';
import { prisma } from '../utils/constants';

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

export async function getPointGiverIdOfGuild(guildId: string | null) {
  if (!guildId) return null;
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
