import { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { embedBuilder, safeReply } from '@julanzw/ttoolbox-discordjs-framework';

import { generateUserStatsImage } from '../../utils/generating.ts';
import { STANDARD_COLOR } from '../../utils/globals.ts';

export async function sendUserStats(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
) {
  await interaction.deferReply();

  const userImage = await generateUserStatsImage(
    interaction.user.id,
    interaction.client,
  );

  const userStatisticsEmbed = embedBuilder({
    title: `Your statistics`,
    description: `Here are your stats for ${new Date().getFullYear()}!`,
    color: STANDARD_COLOR,
    customize: (embed) => {
      embed.setImage('attachment://user_stats.png');
      return embed;
    },
  });

  await safeReply(interaction, '', false, [userStatisticsEmbed], undefined, [
    userImage,
  ]);
}
