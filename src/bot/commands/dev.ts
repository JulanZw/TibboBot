/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatInputCommandInteraction } from 'discord.js';

import { safeReply } from '../utils/discord/editAndReply.ts';

import { BotCommand } from './classes/BotCommand.class.ts';

const testServerId = process.env.TEST_SERVER_ID;

export class DevCommand extends BotCommand {
  name = 'dev';
  description = 'Dev.';
  guildOnly = false;
  permissionLevel = 'owner' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    await safeReply(interaction,'command succesfully executed.');
  }
}
