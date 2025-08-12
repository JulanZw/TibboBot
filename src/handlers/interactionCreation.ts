import { Interaction } from 'discord.js';
import { $Enums } from '@prisma/client';

import { client } from '..';
import { commands } from '../commands';
import { safeReply, scheduleReminder } from '../utils/general';
import { parseDurationOrDateString } from '../utils/parsers';
import { ownerId } from '../utils/globals';
import { ensureGuildExistance } from '../database/guild';
import { getReminderById, updateReminder } from '../database/reminders';
import { logWithTime } from '../utils/logging';

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

    if (
      (command.guildOnly ||
        (command.subcommands &&
          command.subcommands.get(interaction.options.getSubcommand())
            ?.guildOnly)) &&
      (!interaction.guildId || !interaction.guild)
    ) {
      return await safeReply(
        interaction,
        'This command can only be used in a server.',
        true,
      );
    }

    if (
      (command.permissionLevel === 'admin' ||
        (command.subcommands &&
          command.subcommands.get(interaction.options.getSubcommand())
            ?.permissionLevel === 'admin')) &&
      !interaction.memberPermissions?.has('Administrator')
    ) {
      return safeReply(
        interaction,
        'You do not have permission to use this command.',
        true,
      );
    }

    if (
      command.permissionLevel === 'owner' &&
      (!process.env.OWNER_DISCORD_ID || interaction.user.id !== ownerId)
    ) {
      return await safeReply(interaction, 'You didn’t say the magic word...');
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

    const newRemindAt = parseDurationOrDateString(editTime);

    if (!newRemindAt || newRemindAt < new Date()) {
      return await safeReply(interaction, 'Invalid or past date.', true);
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
      `Reminder updated!\n**New Message:** ${editMessage}\n**New Time:** <t:${Math.floor(newRemindAt.getTime() / 1000)}:F>\n**Repeat:** ${updateRepeat.toLowerCase()}`,
      true,
    );
  }
}
