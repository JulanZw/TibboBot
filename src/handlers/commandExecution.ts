import { ChatInputCommandInteraction } from 'discord.js';

import { client } from '..';
import { commands } from '../commands';
import { checkCooldown, formatDuration } from '../utils/cooldownManager';
import { safeReply, checkPermission } from '../utils/general';
import { logWithTime } from '../utils/logging';

const scope = 'handler_INTERACTIONCREATION_COMMAND';

export async function executeCommand(interaction: ChatInputCommandInteraction) {
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

    if (process.env.ENV !== 'dev') {
      const onCooldown = checkCooldown(subCommand, interaction.user.id);

      if (!onCooldown.allowed) {
        return await safeReply(
          interaction,
          `You need to wait ${formatDuration(onCooldown.remaining as number)} before using this command again.`, // idk why ts whines about it nog existing when its not allowed, but it does
          true,
        );
      }
    }
  } else {
    // Regular command
    const canRun = await checkPermission(
      command.guildOnly,
      command.permissionLevel,
      interaction,
    );
    if (!canRun) return;

    if (process.env.ENV !== 'dev') {
      const onCooldown = checkCooldown(command, interaction.user.id);

      if (!onCooldown.allowed) {
        return await safeReply(
          interaction,
          `You need to wait ${formatDuration(onCooldown.remaining as number)} before using this command again.`, // idk why ts whines about it nog existing when its not allowed, but it does
          true,
        );
      }
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
}
