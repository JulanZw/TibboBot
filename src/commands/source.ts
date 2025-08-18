import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import { commandBuilder } from '../utils/general';
import { STANDARD_COLOR } from '../utils/globals';

export const sourceCommand = commandBuilder(
  'source',
  'Get a link to the source code',
  async (interaction) => {
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
  false,
  'user',
);
