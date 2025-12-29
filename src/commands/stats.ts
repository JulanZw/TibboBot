import {
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
} from 'discord.js';

import { Subcommand } from '../types/commands.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';
import { safeReply } from '../utils/discord/editAndReply.ts';
import {
  generateGuildStatsImage,
  generateUserStatsImage,
} from '../utils/generating.ts';
import {
  createButton,
  createButtonsRow,
  embedBuilder,
} from '../utils/discord/embeds.ts';
import { STANDARD_COLOR, TIMES_MILISECONDS } from '../utils/globals.ts';

const statsCommands = commandBuilder({
  name: 'stats',
  description: 'All commands related to statistics.',
  subcommands: new Map<string, Subcommand>([
    [
      'guild',
      {
        name: 'guild',
        description: 'Shows the stats of a guild.',
        execute: async (interaction: ChatInputCommandInteraction) => {
          if (!interaction.guild || !interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          await interaction.deferReply();

          const usersIds = (await interaction.guild.members.fetch()).map(
            (m) => m.id,
          );

          const image = await generateGuildStatsImage(
            usersIds,
            interaction.guildId,
            interaction.client,
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

          const button = createButton({
            type: 'view_self',
            label: 'View your stats!',
            style: ButtonStyle.Primary,
          });

          await safeReply(
            interaction,
            '',
            false,
            [guildStatsEmbed],
            [createButtonsRow([button])],
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
        },
        guildOnly: true,
        permissionLevel: 'user',
      },
    ],
    [
      'user',
      {
        name: 'user',
        description: 'Shows your stats.',
        execute: async (interaction: ChatInputCommandInteraction) => {
          await sendUserStats(interaction);
        },
        guildOnly: false,
        permissionLevel: 'user',
      },
    ],
  ]),
});

export default statsCommands;

async function sendUserStats(
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
