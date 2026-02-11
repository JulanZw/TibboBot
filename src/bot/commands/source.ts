import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from 'discord.js';

import { STANDARD_COLOR } from '../utils/globals.ts';

import { BotCommand } from './classes/BotCommand.class.ts';

export class SourceCommand extends BotCommand {
  name = 'source';
  description = 'Get a link to the source code';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
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
  }
}
