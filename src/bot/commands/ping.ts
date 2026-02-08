import { ChatInputCommandInteraction } from 'discord.js';

import { safeReply } from '../../core/utils/editAndReply.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';

const pingCommand = commandBuilder({
  name: 'ping',
  description: 'Responds with "pong" to check if the bot is online.',
  execute: async (interaction: ChatInputCommandInteraction) => {
    await safeReply(
      interaction,
      `Pong\nLatency: \`${new Date().getTime() - interaction.createdAt.getTime()} ms\``,
    );
  },
  guildOnly: false,
  permissionLevel: 'user',
});

export default pingCommand;
