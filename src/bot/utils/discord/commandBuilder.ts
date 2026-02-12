import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
} from 'discord.js';

import { Command, RegisterableCommand } from '../../types/commands.ts';
import { PermissionLevel } from '../../types/permission.ts';
import { ownerId } from '../globals.ts';
import { safeReply } from '../../../core/utils/editAndReply.ts';
import { logWithTime } from '../../../core/utils/logging.ts';
import { getPermissionsForLevel } from '../../../core/utils/permissions.ts';

const scope = 'commandBuilder';

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
export function commandBuilder(cmd: Command): RegisterableCommand {
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
