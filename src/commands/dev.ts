/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../impl/BotCommand.class.ts';

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
