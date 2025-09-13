import {
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { enqueue } from '../utils/backupQueue';

export const backupCommand = commandBuilder({
  name: 'backup',
  description: 'Makes a backup of the current channel.',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
      return await safeReply(
        interaction,
        'This command only works in text channels.',
        true,
      );
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const position = enqueue(interaction);

    await interaction.editReply({
      content: `Backup is ${position === 0 ? 'being worked on...' : `#${position} in queue`}`,
    });
  },
  guildOnly: true,
  permissionLevel: 'user',
});
