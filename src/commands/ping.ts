import { ChatInputCommandInteraction } from 'discord.js';
import {
  PermissionLevel,
  safeReply,
} from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../impl/BotCommand.class.ts';

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
