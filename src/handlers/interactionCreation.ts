import { Interaction } from 'discord.js';
import { $Enums } from '@prisma/client';

import { client } from '..';
import { commands } from '../commands';
import { checkPermission, safeReply, scheduleReminder } from '../utils/general';
import { parseDurationOrDateString } from '../utils/parsers';
import { ensureGuildExistance } from '../database/guild';
import { getReminderById, updateReminder } from '../database/reminders';
import { logWithTime } from '../utils/logging';
import { capitalizeFirst } from '../utils/formatting';
import { checkCooldown, formatDuration } from '../utils/cooldownManager';

const scope = 'handler_INTERACTIONCREATION';

export async function handleInteractionCreation(interaction: Interaction) {
  if (interaction.guildId) {
    await ensureGuildExistance(interaction.guildId);
  }

  if (interaction.isChatInputCommand()) {
    const command = commands.find((c) => c.name === interaction.commandName);

    if (!command) {
      return safeReply(
        interaction,
        `Unknown command: ${interaction.commandName}`,
        true,
      );
    }

    if ('subcommands' in command) {
      const subCommand = command.subcommands.get(
        interaction.options.getSubcommand(),
      );
      if (!subCommand) {
        return safeReply(
          interaction,
          `Unknown subcommand: ${interaction.options.getSubcommand()}`,
          true,
        );
      }
      const canRun = await checkPermission(
        subCommand?.guildOnly,
        subCommand?.permissionLevel,
        interaction,
      );
      if (!canRun) return;

      const onCooldown = checkCooldown(subCommand, interaction.user.id);

      if (!onCooldown.allowed) {
        return await safeReply(
          interaction,
          `You need to wait ${formatDuration(onCooldown.remaining!)} before using this command again.`,
          true,
        );
      }
    } else {
      // Regular command
      const canRun = await checkPermission(
        command.guildOnly,
        command.permissionLevel,
        interaction,
      );
      if (!canRun) return;

      const onCooldown = checkCooldown(command, interaction.user.id);

      if (!onCooldown.allowed) {
        return await safeReply(
          interaction,
          `You need to wait ${formatDuration(onCooldown.remaining!)} before using this command again.`,
          true,
        );
      }
    }

    try {
      await command.execute(interaction, client);
    } catch (err: any) {
      logWithTime(
        `Error executing command ${interaction.commandName}: ` + err,
        'error',
        scope,
        true,
      );
      await safeReply(
        interaction,
        'There was an error executing that command.',
        true,
      );
    }
  } else if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith('editReminderModal:')
  ) {
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
  }
}
