import { prisma } from '../utils/constants';

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
