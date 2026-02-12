import { ChatInputCommandInteraction } from 'discord.js';

import { client } from '../index.ts';
import { commandManager } from '../commands.ts';
import { safeReply } from '../../core/utils/editAndReply.ts';
import { logWithTime } from '../../core/utils/logging.ts';

const scope = 'handler_INTERACTIONCREATION_COMMAND';

export async function executeCommand(interaction: ChatInputCommandInteraction) {
  try {
    await commandManager.executeCommand(
      interaction.commandName,
      interaction,
      client,
    );
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
