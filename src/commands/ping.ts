import { commandBuilder, safeReply } from '../utils/general';

export const pingCommand = commandBuilder(
  'ping',
  'Responds with "pong" to check if the bot is online.',
  async (interaction) => {
    await safeReply(interaction, 'pong');
  },
  false,
  'user',
);
