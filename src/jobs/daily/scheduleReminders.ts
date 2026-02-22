import { Client } from 'discord.js';

import { getRemindersOfToday } from '../../database/reminders.ts';
import { logger } from '../../index.ts';
import { scheduleReminder } from '../../utils/managers/reminderManager.ts';

export async function scheduleReminders(client: Client) {
  const scope = 'cron_DAILY_REMINDERS';
  try {
    const todaysReminders = await getRemindersOfToday();

    for (const reminder of todaysReminders) {
      const user = await client.users.fetch(reminder.userId);
      scheduleReminder(user, reminder);
    }

    logger.info(
      `Scheduled ${todaysReminders.length} reminders for today.`,
      scope,
    );
  } catch (err: any) {
    logger.error(`Failed to schedule today's reminders: ${err}`, scope, true);
  }
}
