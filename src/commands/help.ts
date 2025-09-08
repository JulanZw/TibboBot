import { ChatInputCommandInteraction, ComponentType } from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { embedBuilder, createButtonsRow } from '../utils/embeds';
import { commandNamesAndDescriptions } from '../commands';

export const helpCommand = commandBuilder({
  name: 'help',
  description: 'Displays all commands.',
  execute: async (interaction: ChatInputCommandInteraction) => {
    let index = 0;
    const totalPages = commandNamesAndDescriptions.length;

    const embed = embedBuilder({
      title: 'List of Available Commands',
      description: 'Here are the commands you can use:',
      fields: commandNamesAndDescriptions[index],
      footer: `Page ${index + 1} of ${totalPages}`,
    });

    const components = [createButtonsRow(index, totalPages, ['prev', 'next'])];

    await safeReply(interaction, '', false, [embed], components);

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, // 2 mins
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return await safeReply(
          buttonInteraction,
          'You cannot use this button.',
          true,
        );
      }

      const action = buttonInteraction.customId;

      switch (action) {
        case 'prev':
          index = Math.max(0, index - 1);
          break;
        case 'next':
          index = Math.min(totalPages - 1, index + 1);
          break;
        default:
          return await safeReply(buttonInteraction, 'Invalid action.', true);
      }

      const newEmbed = embedBuilder({
        title: 'List of Available Commands',
        description: 'Here are the commands you can use:',
        fields: commandNamesAndDescriptions[index],
        footer: `Page ${index + 1} of ${totalPages}`,
      });

      const newComponents = [
        createButtonsRow(index, totalPages, ['prev', 'next']),
      ];

      await buttonInteraction.update({
        embeds: [newEmbed],
        components: newComponents,
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async () => {
      await interaction.editReply({ components: [] });
    });
  },
  guildOnly: false,
  permissionLevel: 'user',
});
