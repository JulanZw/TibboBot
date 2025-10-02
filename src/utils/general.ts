import Stream from 'stream';

import {
  ActionRowBuilder,
  APIAttachment,
  Attachment,
  AttachmentBuilder,
  AttachmentPayload,
  BufferResolvable,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  Client,
  EmbedBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  JSONEncodable,
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
import { parse } from 'mathjs';

import { deleteReminder, updateReminder } from '../database/reminders.ts';

import {
  PermissionLevel,
  Command,
  Registerable,
} from './typesAndInterfaces.ts';
import { logWithTime } from './logging.ts';
import { addDays } from './parsers.ts';
import { ownerId, scheduledReminderJobs } from './globals.ts';

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
  files?: (
    | BufferResolvable
    | Stream
    | JSONEncodable<APIAttachment>
    | Attachment
    | AttachmentBuilder
    | AttachmentPayload
  )[],
) {
  const payload: InteractionReplyOptions = {
    ...(content ? { content } : {}),
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
    ...(files ? { files } : {}),
  };

  if (!interaction.replied && !interaction.deferred) {
    try {
      const now = Date.now();
      const threeMinutes = 3 * 60 * 1000;

      if (now - interaction.createdTimestamp > threeMinutes) {
        logWithTime(
          'This interaction is older than 3 minutes.',
          'error',
          scope,
          true,
        );
        return;
      }
      return await interaction.reply(payload);
    } catch {
      logWithTime(
        `Failed to reply to interaction: ${interaction.id}`,
        'error',
        scope,
        true,
      );
    }
  } else {
    try {
      return await interaction.followUp(payload);
    } catch {
      logWithTime(
        `Failed to reply to interaction: ${interaction.id}`,
        'error',
        scope,
        true,
      );
    }
  }
}

//#endregion

//#region SafeEdit

/**
 * Utility function so edits don't fail
 *
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
 */
export async function safeEdit(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  content: string,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[],
) {
  const editPayload: InteractionEditReplyOptions = {
    ...(content ? { content } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  try {
    const now = Date.now();
    const threeMinutes = 3 * 60 * 1000;

    if (now - interaction.createdTimestamp > threeMinutes) {
      logWithTime(
        'This interaction is older than 3 minutes.',
        'error',
        scope,
        true,
      );
      return;
    }
    return await interaction.editReply(editPayload);
  } catch {
    logWithTime(
      `Failed to edit interaction: ${interaction.id}`,
      'error',
      scope,
      true,
    );
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
 * A factory function to construct a Discord slash command.
 *
 * - If `subcommands` are provided, the command is treated as a **subcommand group**,
 *   and the returned `execute` will resolve the correct subcommand at runtime.
 * - Otherwise, the command is treated as a **regular command**, with its own
 *   `execute` handler and optional customization of the command builder.
 *
 * @param cmd - A `Command` definition, describing either a regular command
 *              (with `execute`, `guildOnly`, etc.) or a subcommand group
 *              (with a `subcommands` map).
 *
 * @returns A `Registerable` object that can be passed to Discord.js for registration
 *          and executed when a slash command interaction occurs.
 */
export function commandBuilder(cmd: Command): Registerable {
  const builder = new SlashCommandBuilder()
    .setName(cmd.name)
    .setDescription(cmd.description);

  if ('subcommands' in cmd) {
    for (const [name, sub] of cmd.subcommands) {
      builder.addSubcommand((sc) =>
        (sub.customize ?? ((b) => b))(
          sc.setName(name).setDescription(sub.description),
        ),
      );
    }
    return {
      name: cmd.name,
      description: cmd.description,
      subcommands: cmd.subcommands,
      data: builder,
      execute: async (
        interaction: ChatInputCommandInteraction,
        client: Client,
      ) => {
        const subcommandName = interaction.options.getSubcommand();
        const subcommand = cmd.subcommands.get(subcommandName);

        if (!subcommand) {
          throw new Error(`Unknown subcommand: ${subcommandName}`);
        }

        await safeExecute(cmd.name, interaction, () =>
          subcommand.execute(interaction, client),
        );
      },
    };
  } else {
    builder.setDefaultMemberPermissions(
      getPermissionsForLevel(cmd.permissionLevel),
    );
    if (cmd.customize) cmd.customize(builder);

    return {
      name: cmd.name,
      description: cmd.description,
      guildOnly: cmd.guildOnly,
      permissionLevel: cmd.permissionLevel,
      customize: cmd.customize,
      data: builder,
      execute: async (
        interaction: ChatInputCommandInteraction,
        client: Client,
      ) =>
        await safeExecute(cmd.name, interaction, () =>
          cmd.execute(interaction, client),
        ),
    };
  }
}

/**
 * Utility function to check if the command can run or not
 *
 * @param guildOnly - if the command can only be ran in a guild
 * @param permissionLevel - the permission level required to run the command
 * @param interaction - the interaction that ran the command
 * @returns A promise with as result a boolean
 */
export async function checkPermission(
  guildOnly: boolean,
  permissionLevel: PermissionLevel,
  interaction: ChatInputCommandInteraction,
): Promise<boolean> {
  if (guildOnly && !interaction.guild) {
    await safeReply(
      interaction,
      'This command can only be used in a server.',
      true,
    );
    return false;
  } else if (
    permissionLevel === 'admin' &&
    !interaction.memberPermissions?.has('Administrator')
  ) {
    await safeReply(
      interaction,
      'You do not have permission to use this command.',
      true,
    );
    return false;
  } else if (
    permissionLevel === 'owner' &&
    (!ownerId || interaction.user.id !== ownerId)
  ) {
    await safeReply(interaction, 'You didn’t say the magic word...', true);
    return false;
  }
  return true;
}

async function safeExecute(
  commandName: string,
  interaction: ChatInputCommandInteraction,
  fn: () => Promise<any>,
) {
  try {
    await fn();
    const subcommandName = interaction.options.getSubcommand(false);
    logWithTime(
      `${commandName} ${subcommandName ? `(${subcommandName}) ` : ``}command executed`,
      'info',
      scope,
    );
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

//#region math

const allowedMathWords = [
  'sqrt',
  'sin',
  'cos',
  'tan',
  'log',
  'ln',
  'pi',
  'e',
  'abs',
  'mod',
  'round',
  'floor',
  'ceil',
];

export function looksLikeMathExpression(input: string): boolean {
  const hasMathThings =
    /\d/.test(input) ||
    allowedMathWords.some((word) => input.includes(word)) ||
    /[+\-*/^=()]/.test(input);

  if (!hasMathThings) return false;

  try {
    const node = parse(input);
    return !!node;
  } catch {
    return false;
  }
}

//#endregion
