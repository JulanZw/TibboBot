import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

import { commandBuilder } from '../utils/general.ts';
import { STANDARD_COLOR } from '../utils/globals.ts';

export const sourceCommand = commandBuilder({
  name: 'source',
  description: 'Get a link to the source code',
  execute: async (interaction: ChatInputCommandInteraction) => {
    const repoUrl = 'https://github.com/JulanZw/TibboBot.git';

    const embed = new EmbedBuilder()
      .setTitle('Bot Source Code')
      .setDescription(
        'The full source code for this bot is available on GitHub.',
      )
      .setColor(STANDARD_COLOR);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View on GitHub')
        .setStyle(ButtonStyle.Link)
        .setURL(repoUrl),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
  guildOnly: false,
  permissionLevel: 'user',
});

export default sourceCommand;
