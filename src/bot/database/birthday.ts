import { prisma } from '../utils/globals.ts';

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

export async function deleteAllBirthdaysForUser(userId: string) {
  return await prisma.birthday.deleteMany({
    where: { userId },
  });
}

export async function getAllBirthdaysInGuildForGivenDate(
  guildId: string,
  date: Date,
) {
  const targetMonth = date.getUTCMonth();
  const targetDate = date.getUTCDate();

  const birthdays = await getAllBirthdaysInGuild(guildId);

  return birthdays.filter((entry) => {
    const bday = new Date(entry.birthday);
    return (
      bday.getUTCMonth() === targetMonth && bday.getUTCDate() === targetDate
    );
  });
}

export async function getAllBirthdaysInGuild(guildId: string) {
  return await prisma.birthday.findMany({
    where: { guildId },
    include: { user: true },
  });
}
