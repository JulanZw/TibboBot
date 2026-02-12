import { Reminders, $Enums } from '@prisma/client';
import { User } from 'discord.js';
import cron, { ScheduledTask } from 'node-cron';

import { updateReminder, deleteReminder } from '../../database/reminders.ts';
import { addDays } from '../parsers.ts';
import { logWithTime } from '../../../core/utils/logging.ts';

const scheduledReminderJobs = new Map<string, ScheduledTask>();

const scope = 'reminders';

export function scheduleReminder(user: User, reminder: Reminders) {
  clearReminder(reminder.id);

  const date = reminder.remindAt;
  const cronExpression = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${
    date.getMonth() + 1
  } *`;

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  const job = cron.schedule(cronExpression, async () => {
    try {
      await user.send(`**Reminder:** ${reminder.message}`);
      logWithTime(
        `Sent reminder ${reminder.id} to ${reminder.userId}`,
        'info',
        scope,
      );
      if (reminder.remindInterval === $Enums.Intervals.DAILY) {
        await updateReminder(
          reminder.id,
          reminder.message,
          addDays(1, reminder.remindAt),
        );
        logWithTime(`Updated daily reminder ${reminder.id}`, 'info', scope);
      } else if (reminder.remindInterval === $Enums.Intervals.WEEKLY) {
        await updateReminder(
          reminder.id,
          reminder.message,
          addDays(7, reminder.remindAt),
        );
        logWithTime(`Updated weekly reminder ${reminder.id}`, 'info', scope);
      } else {
        await deleteReminder(reminder.id);
        logWithTime(`Deleted reminder ${reminder.id}`, 'info', scope);
      }
    } catch (err: any) {
      logWithTime(
        `Failed to send reminder ${reminder.id}: ${err}`,
        'error',
        scope,
        true,
      );
    } finally {
      clearReminder(reminder.id);
      logWithTime(`Cleaned up reminder ${reminder.id}`, 'info', scope);
    }
  });
  scheduledReminderJobs.set(reminder.id, job);

  logWithTime(
    `Scheduled reminder ${reminder.id} for ${date.toISOString()}`,
    'info',
    scope,
  );
}

/**
 * Clears the reminder if it exists.
 * @param reminderId The id of the reminder to clear
 */
export function clearReminder(reminderId: string) {
  const job = scheduledReminderJobs.get(reminderId);
  if (job) {
    job.stop();
    scheduledReminderJobs.delete(reminderId);
  }
}
