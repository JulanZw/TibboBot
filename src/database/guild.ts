import { logWithTime } from '../utils/logging.ts';
import { BotChannel } from '../utils/typesAndInterfaces.ts';
import { prisma } from '../utils/globals.ts';

const scope = 'database_GUILD';

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
        scope,
      );
      break;
    case 'today-is':
      updateData.todayIsChannelId = channelId;
      logWithTime(
        `Today-is channel updated to ${channelId} for guild ${guildId}`,
        'info',
        scope,
      );
      break;
    case 'birthday':
      updateData.birthdayChannelId = channelId;
      logWithTime(
        `Birthday channel updated to ${channelId} for guild ${guildId}`,
        'info',
        scope,
      );
      break;
    default:
      return logWithTime(
        `Invalid channel type: ${channelType as BotChannel}`,
        'error',
        scope,
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
        scope,
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
export async function removeAllPointgiverRolesForUser(userId: string) {
  return await prisma.guild.updateMany({
    where: { pointGiverId: userId },
    data: { pointGiverId: null },
  });
}

export async function deleteGuild(guildId: string) {
  return await prisma.guild.delete({
    where: { guildId },
  });
}

export async function updateDumbScore(guildId: string, humanWon: boolean) {
  const guild = await getGuild(guildId);
  if (humanWon && guild && guild.dumbScore > 0) {
    return await prisma.guild.update({
      where: { guildId },
      data: { dumbScore: { decrement: 1 } },
    });
  } else if (guild && guild.dumbScore < 10) {
    return await prisma.guild.update({
      where: { guildId },
      data: { dumbScore: { increment: 1 } },
    });
  }
}

export async function getAllowBackup(guildId: string) {
  const guild = await getGuild(guildId);
  if (guild) {
    return guild.allowBackups;
  } else {
    throw new Error('Guild not found, but should exist');
  }
}

export async function toggleAllowBackup(guildId: string) {
  const result = await getAllowBackup(guildId);

  return await prisma.guild.update({
    where: { guildId },
    data: { allowBackups: !result },
  });
}
