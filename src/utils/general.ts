import {
  ActionRowBuilder,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  InteractionReplyOptions,
  MessageFlags,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  StringSelectMenuInteraction,
  User,
} from 'discord.js';
import cron from 'node-cron';
import { Reminders, $Enums } from '@prisma/client';

import { deleteReminder, updateReminder } from '../database/reminders';

import { PermissionLevel, Subcommand, Command } from './typesAndInterfaces';
import { logWithTime } from './logging';
import { addDays } from './parsers';
import { scheduledReminderJobs } from './globals';

const scope = 'general';

//#region SafeReply

/**
 * Utility function so replies don't fail
 *
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param ephemeral - If it's ephemeral or not
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
 */
export async function safeReply(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  content: string,
  ephemeral: boolean = false,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[],
) {
  const payload: InteractionReplyOptions = {
    ...(content ? { content } : {}),
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  if (!interaction.replied && !interaction.deferred) {
    return await interaction.reply(payload);
  } else {
    return await interaction.followUp(payload);
  }
}

//#endregion

//#region Permissions

/**
 * Utility function to return the proper permission bits
 *
 * @param level - the PermissionLevel the bits need to be returned of. Can be an array
 * @returns the permission's bit value or null for unrestricted
 */
export function getPermissionsForLevel(level: PermissionLevel): bigint | null {
  if (level === 'admin') {
    return PermissionFlagsBits.Administrator;
  }

  if (level === 'owner' || level === 'disabled') {
    return BigInt(0); // disable the command by default
  }

  if (typeof level === 'bigint' || typeof level === 'number') {
    return BigInt(level);
  }

  if (Array.isArray(level)) {
    return new PermissionsBitField(level).bitfield;
  }

  return null; // unrestricted
}

//#endregion

//#region Command Builder

/**
 * A utility function to easily create a Discord slash command.
 *
 * Supports optional customization of the command builder, and flags to mark
 * the command as admin-only or guild-only for internal logic.
 *
 * @param name - The name of the command (used in Discord).
 * @param description - A short description of the command.
 * @param execute - The function to execute when the command is run.
 * @param guildOnly - Whether this command can only be used in a server (used for internal checks).
 * @param permissionLevel - The permission level the user needs to have to use this command.
 * @param customize - Optional callback to customize the SlashCommandBuilder with additional options.
 *
 * @returns The constructed `Command` object.
 */
export function commandBuilder(
  name: string,
  description: string,
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>,
  guildOnly: boolean,
  permissionLevel: PermissionLevel,
  customize: (builder: SlashCommandBuilder) => SlashCommandBuilder = (b) => b,
  subcommands?: Map<string, Subcommand>,
): Command {
  const builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(getPermissionsForLevel(permissionLevel));

  if (subcommands && subcommands.size > 0) {
    for (const [name, sub] of subcommands) {
      builder.addSubcommand((sc) =>
        (sub.customize ?? ((b) => b))(
          sc.setName(name).setDescription(sub.description),
        ),
      );
    }
  } else {
    customize(builder);
  }

  return {
    data: builder,
    name,
    description,
    permissionLevel,
    guildOnly,
    execute: async (interaction: ChatInputCommandInteraction, client: Client) =>
      safeExecute(name, interaction, async () => {
        const subcommandName = interaction.options.getSubcommand(false);

        if (subcommandName && subcommands) {
          const sub = subcommands.get(subcommandName);
          if (sub) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return await sub.execute(interaction, client);
          } else {
            return await interaction.reply({
              content: `Unknown subcommand: ${subcommandName}`,
              ephemeral: true,
            });
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await execute(interaction, client);
      }),
    subcommands,
  };
}

async function safeExecute(
  commandName: string,
  interaction: ChatInputCommandInteraction,
  fn: () => Promise<any>,
) {
  try {
    await fn();
    logWithTime(`${commandName} command executed`, 'info', scope);
  } catch (err: any) {
    logWithTime('An Error occured' + err, 'error', scope, true);
    return await safeReply(interaction, 'An unexpected error occurred.');
  }
}

//#endregion

//#region Reminders

export function scheduleReminder(user: User, reminder: Reminders) {
  if (scheduledReminderJobs.has(reminder.id)) {
    scheduledReminderJobs.get(reminder.id)!.stop();
    scheduledReminderJobs.delete(reminder.id);
  }

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
      scheduledReminderJobs.delete(reminder.id);
      job.stop();
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

//#endregion
