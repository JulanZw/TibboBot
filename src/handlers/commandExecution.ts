import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discordjs-framework';

import { client, logger } from '../index.ts';
import { commandManager } from '../index.ts';

const scope = 'handler_INTERACTIONCREATION_COMMAND';

export async function executeCommand(interaction: ChatInputCommandInteraction) {
  try {
    await commandManager.executeCommand(
      interaction.commandName,
      interaction,
      client,
    );
  } catch (err: any) {
    logger.error(
      `Error executing command ${interaction.commandName}: ` + err,
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
