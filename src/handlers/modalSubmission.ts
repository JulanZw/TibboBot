import { $Enums } from '@prisma/client';
import { ModalSubmitInteraction } from 'discord.js';

import {
  deleteAllRemindersForUser,
  getReminderById,
  updateReminder,
} from '../database/reminders';
import { capitalizeFirst } from '../utils/formatting';
import { safeReply, scheduleReminder } from '../utils/general';
import { parseDurationOrDateString } from '../utils/parsers';
import { deleteAllBirthdaysForUser } from '../database/birthday';
import {
  removeAllPointgiverRolesForUser,
  getGuild,
  deleteGuild,
} from '../database/guild';
import { deleteUser } from '../database/user';
import { handleConfirmModal } from '../utils/confirmation';
import { logWithTime } from '../utils/logging';

const scope = 'handler_INTERACTIONCREATION_MODALS';

export async function handleModal(interaction: ModalSubmitInteraction) {
  if (interaction.customId.startsWith('editReminderModal:')) {
    const reminderId = interaction.customId.split(':')[1];
    const editMessage = interaction.fields.getTextInputValue('editMessage');
    const editTime = interaction.fields.getTextInputValue('editTime');
    const editRepeat = interaction.fields.getTextInputValue('editRepeat');

    const updateRepeat =
      editRepeat && editRepeat.toUpperCase() in $Enums.Intervals
        ? $Enums.Intervals[
            editRepeat.toUpperCase() as keyof typeof $Enums.Intervals
          ]
        : $Enums.Intervals.NONE;

    const reminder = await getReminderById(reminderId);
    if (!reminder || reminder.userId !== interaction.user.id) {
      return await safeReply(
        interaction,
        'Reminder not found or unauthorized.',
        true,
      );
    }

    let newRemindAt: Date;

    if (editTime) {
      const parsed = parseDurationOrDateString(editTime);

      if (!parsed || parsed < new Date()) {
        return await safeReply(interaction, 'Invalid or past date.', true);
      }

      newRemindAt = parsed;
    } else {
      newRemindAt = reminder.remindAt;
    }

    const editedReminder = await updateReminder(
      reminderId,
      editMessage,
      newRemindAt,
      updateRepeat,
    );

    scheduleReminder(interaction.user, editedReminder);

    return await safeReply(
      interaction,
      `Reminder updated!\n**New Message:** ${editMessage}\n**New Time:** <t:${Math.floor(newRemindAt.getTime() / 1000)}:F>\n**Repeat:** ${capitalizeFirst(updateRepeat)}`,
      true,
    );
  } else if (interaction.customId.startsWith('purge')) {
    if (interaction.customId === 'purge_user_confirm_modal') {
      const confirmed = await handleConfirmModal(interaction);
      if (confirmed) {
        const userId = interaction.user.id;

        const deletedBirthdays = await deleteAllBirthdaysForUser(userId);
        logWithTime(`Removed all birthdays for user: ${userId}`, 'info', scope);
        const deletedReminders = await deleteAllRemindersForUser(userId);
        logWithTime(`Removed all reminders for user: ${userId}`, 'info', scope);
        const deletedPointGiverRoles =
          await removeAllPointgiverRolesForUser(userId);
        logWithTime(
          `Removed all pointgiver roles for user: ${userId}`,
          'info',
          scope,
        );
        await deleteUser(userId);
        logWithTime(`Deleted user: ${userId}`, 'info', scope);

        await safeReply(
          interaction,
          `**Deleted:**\nBirthdays: ${deletedBirthdays.count}\nReminders: ${deletedReminders.count}${
            deletedPointGiverRoles.count > 0
              ? `\nPointgiver roles: ${deletedPointGiverRoles.count}`
              : ''
          }`,
        );
      }
    }

    if (interaction.customId === 'purge_guild_confirm_modal') {
      const confirmed = await handleConfirmModal(interaction);
      if (confirmed) {
        const guild = await getGuild(interaction.guild!.id);
        if (!guild) {
          return await safeReply(
            interaction,
            'Guild is not in the database.',
            true,
          );
        }

        await deleteGuild(guild.guildId);
        logWithTime(`Deleted guild: ${guild.guildId}`, 'info', scope);

        await safeReply(interaction, `**Deleted:**\nGuild: ${guild.guildId}`);
      }
    }
  }
}
