import { ChatInputCommandInteraction, ComponentType } from 'discord.js';

import { safeReply } from '../utils/discord/editAndReply.ts';
import {
  embedBuilder,
  createButtonsRow,
  createPaginationButtons,
} from '../utils/discord/embeds.ts';
import { commandNamesAndDescriptions } from '../commands.ts';
import { TIMES_MILISECONDS } from '../utils/globals.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';

const helpCommand = commandBuilder({
  name: 'help',
  description: 'Displays all commands.',
  execute: async (interaction: ChatInputCommandInteraction) => {
    let index = 0;
    const totalPages = commandNamesAndDescriptions.length;
    const buildEmbed = () => [
      embedBuilder({
        title: 'List of Available Commands',
        description: 'Here are the commands you can use:',
        fields: commandNamesAndDescriptions[index],
        footer: `Page ${index + 1} of ${totalPages}`,
      }),
    ];

    const buildButtons = () => {
      const buttons = createPaginationButtons(index, 0); //although they are pagination buttons, there are no other buttons so this works fine
      return [createButtonsRow(buttons)];
    };

    await safeReply(interaction, '', false, buildEmbed(), buildButtons());

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: TIMES_MILISECONDS.MINUTE * 2,
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

      await buttonInteraction.update({
        embeds: buildEmbed(),
        components: buildButtons(),
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

export default helpCommand;
