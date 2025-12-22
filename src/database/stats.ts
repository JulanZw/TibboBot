import { UserStatistics } from '../types/stats.ts';
import { prisma } from '../utils/globals.ts';
import { hasOptedOut } from '../utils/managers/optInOutManager.ts';

export async function getUserStats(userId: string) {
  let stats = await prisma.stats.findUnique({
    where: { userId: userId },
  });
  if (!stats) {
    stats = await prisma.stats.create({
      data: { userId: userId },
    });
  }
  return stats;
}

export async function incrementStatistic(
  statistic: keyof UserStatistics,
  userId: string,
  incrementBy = 1,
) {
  // to prevent having to check everywhere something is incremented
  if (hasOptedOut(userId)) return;

  await prisma.stats.upsert({
    where: { userId: userId },
    create: { userId: userId },
    update: {
      [statistic]: {
        increment:
          statistic === 'charsSentThisYear' ? BigInt(incrementBy) : incrementBy,
      },
    },
  });
}

export async function deleteUserStats(userId: string) {
  await prisma.stats.deleteMany({
    where: { userId: userId },
  });
}

export async function getTotalOfMultipleUserStats(userIds: string[]) {
  const stats = await prisma.stats.findMany({
    where: { userId: { in: userIds } },
  });
  const totalStats: UserStatistics = {
    messagesSentThisYear: 0,
    charsSentThisYear: BigInt(0),
    todayIsParticipationDays: 0,
    todayIsWins: 0,
    remindersSet: 0,
    catsRequested: 0,
  };
  for (const stat of stats) {
    totalStats.messagesSentThisYear += stat.messagesSentThisYear;
    totalStats.charsSentThisYear += stat.charsSentThisYear;
    totalStats.todayIsParticipationDays += stat.todayIsParticipationDays;
    totalStats.todayIsWins += stat.todayIsWins;
    totalStats.remindersSet += stat.remindersSet;
    totalStats.catsRequested += stat.catsRequested;
  }
  return totalStats;
}
