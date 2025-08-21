import { ChatInputCommandInteraction } from 'discord.js';
import { commandBuilder, safeReply } from '../utils/general';

export const pingCommand = commandBuilder({
  name: 'ping',
  description: 'Responds with "pong" to check if the bot is online.',
  execute: async (interaction: ChatInputCommandInteraction) => {
    await safeReply(interaction, 'pong');
  },
  guildOnly: false,
  permissionLevel: 'user',
});
