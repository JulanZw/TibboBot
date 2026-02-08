import { ChatInputCommandInteraction } from 'discord.js';

import { safeReply } from '../../core/utils/editAndReply.ts';
import { PermissionLevel } from '../../core/types/permission.ts';

import { BotCommand } from './classes/BotCommand.class.ts';

export class PingCommand extends BotCommand {
  name = 'ping';
  description = "Responds with 'pong' to check if the bot is online.";
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  async run(interaction: ChatInputCommandInteraction) {
    await safeReply(
      interaction,
      `Pong\nLatency: \`${new Date().getTime() - interaction.createdAt.getTime()} ms\``,
    );
  }
}
