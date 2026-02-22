import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  embedBuilder,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discordjs-framework';

import { generateGuildStatsImage } from '../../../utils/generating.ts';
import { sendUserStats } from '../helper.ts';
import { STANDARD_COLOR } from '../../../utils/globals.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { logger } from '../../../index.ts';

const scope = 'stats_guild';

export class GuildStatsCommand extends BotCommand {
  name = 'guild';
  description = 'Shows the stats of a guild.';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild || !interaction.guildId) {
      await safeReply(
        interaction,
        `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
      );
      return;
    }

    await interaction.deferReply();

    const usersIds = (await interaction.guild.members.fetch()).map((m) => m.id);

    const guildImageUrl = interaction.guild.iconURL({ extension: 'png' });

    const image = await generateGuildStatsImage(
      usersIds,
      guildImageUrl,
      interaction.guild.name,
    );

    const guildStatsEmbed = embedBuilder({
      title: `Guild statistics`,
      description: `Here are the stats for **${interaction.guild.name}** of ${new Date().getFullYear()}!`,
      color: STANDARD_COLOR,
      customize: (embed) => {
        embed.setImage('attachment://guild_stats.png');
        return embed;
      },
    });

    const button = new ButtonBuilder()
      .setCustomId('view_self')
      .setLabel('View your stats!')
      .setStyle(ButtonStyle.Primary);

    await safeReply(
      interaction,
      '',
      false,
      [guildStatsEmbed],
      [new ActionRowBuilder<ButtonBuilder>().addComponents(button)],
      [image],
    );

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIMES_MILISECONDS.MINUTE * 2,
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('collect', async (btnInteraction) => {
      await sendUserStats(btnInteraction);
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (err: any) {
        logger.warn(
          `Could not edit message after collector ended: ${err}`,
          scope,
        );
      }
    });
  }
}
