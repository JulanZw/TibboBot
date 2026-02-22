import {
  embedBuilder,
  createButton,
  createButtonsRow,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discordjs-framework';
import { TextChannel, ButtonStyle, ComponentType } from 'discord.js';

import { sendUserStats } from '../../commands/stats/helper.ts';
import { logger } from '../../index.ts';
import { generateGuildStatsImage } from '../../utils/generating.ts';
import { STANDARD_COLOR } from '../../utils/globals.ts';

export async function sendYearlyStatsImage(
  channel: TextChannel,
  userIds: string[],
  imageURL: string | null,
  guildName: string,
  scope: string,
) {
  const image = await generateGuildStatsImage(userIds, imageURL, guildName);

  const guildStatsEmbed = embedBuilder({
    title: `Guild statistics`,
    description: `Here are the stats for **${guildName}** of ${new Date().getFullYear()}!`,
    color: STANDARD_COLOR,
    customize: (embed) => {
      embed.setImage('attachment://guild_stats.png');
      return embed;
    },
  });

  const button = createButton({
    type: 'view_self',
    label: 'View your stats!',
    style: ButtonStyle.Primary,
  });

  const msg = await channel.send({
    embeds: [guildStatsEmbed],
    components: [createButtonsRow([button])],
    files: [image],
  });

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
      await msg.edit({ components: [] });
    } catch (err: any) {
      logger.warn(
        `Could not edit message after collector ended: ${err}`,
        scope,
      );
    }
  });
}
