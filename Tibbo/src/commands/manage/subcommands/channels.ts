import {
  ActionRowBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  ComponentType,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js';
import {
  safeReply,
  createButton,
  createButtonsRow,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discord-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { getBotChannel, updateBotChannel } from '../../../database/guild.ts';
import { BotChannel } from '../../../types/channel.ts';
import { logger } from '../../../index.ts';

const scope = 'manage_channel';

export class ChannelCommand extends BotCommand {
  name = 'channel';
  description = 'Manage channels';
  guildOnly = true;
  permissionLevel = 'admin' as const;
  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    // this is a garuanteed since its handled in the validation
    const guildId = interaction.guildId as string;

    const selectRow =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('channel_config_menu')
          .setPlaceholder('Select a channel setting to manage')
          .addOptions([
            { label: 'Birthday Channel', value: 'birthday' },
            { label: 'Counting Channel', value: 'count' },
            { label: 'Today-is Channel', value: 'today-is' },
          ]),
      );

    await safeReply(
      interaction,
      'Which channel setting would you like to manage?',
      true,
      undefined,
      [selectRow],
    );

    const msg = await interaction.fetchReply();

    const menuCollector = msg.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === interaction.user.id &&
        i.customId === 'channel_config_menu',
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    menuCollector.on('collect', async (menuInteraction) => {
      const selected = menuInteraction.values[0];

      const buttons = [
        createButton({
          type: 'set',
          label: 'Set',
          style: ButtonStyle.Primary,
          customId: `set_${selected}`,
        }),
        createButton({
          type: 'reset',
          label: 'Reset',
          style: ButtonStyle.Danger,
          customId: `reset_${selected}`,
        }),
        createButton({
          type: 'cancel',
          label: 'Cancel',
          style: ButtonStyle.Secondary,
        }),
      ];

      const existingBotChannel = await getBotChannel(
        guildId,
        selected as BotChannel,
      );

      await menuInteraction.update({
        content: existingBotChannel
          ? `You selected: **${selected}**.\nCurrent channel: <#${existingBotChannel}>\nChoose an action:`
          : `You selected: **${selected}**.\nCurrent channel: [not set]\nChoose an action:`,
        components: [createButtonsRow(buttons)],
      });

      menuCollector.stop();

      const buttonCollector = msg.createMessageComponentCollector({
        filter: (i) =>
          i.user.id === interaction.user.id &&
          (i.customId.startsWith('set_') ||
            i.customId.startsWith('reset_') ||
            i.customId === 'cancel'),
        componentType: ComponentType.Button,
        time: 60000,
      });

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      buttonCollector.on('collect', async (buttonInteraction) => {
        const [action, selectedChannel] = buttonInteraction.customId.split('_');

        if (action === 'cancel') {
          await buttonInteraction.update({
            content: 'Action cancelled.',
            components: [],
          });
          return buttonCollector.stop();
        } else if (action === 'reset') {
          await updateBotChannel(guildId, selectedChannel as BotChannel, null);
          logger.info(`Reset ${selectedChannel} channel for ${guildId}`, scope);
          await buttonInteraction.update({
            content: `${selectedChannel} channel reset.`,
            components: [],
          });
          return buttonCollector.stop();
        } else {
          const channelSelect =
            new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
              new ChannelSelectMenuBuilder()
                .setCustomId(`choose_${selectedChannel}`)
                .setPlaceholder('Select a channel')
                .addChannelTypes(ChannelType.GuildText),
            );

          const channelMsg = await buttonInteraction.update({
            content: 'Pick a new channel below:',
            components: [channelSelect],
          });

          const channelCollector = channelMsg.createMessageComponentCollector({
            filter: (i) =>
              i.user.id === interaction.user.id &&
              i.customId === `choose_${selectedChannel}`,
            componentType: ComponentType.ChannelSelect,
            time: TIMES_MILISECONDS.MINUTE,
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          channelCollector.on('collect', async (channelInteraction) => {
            const newChannel = channelInteraction.channels.first();
            if (!newChannel)
              return safeReply(
                channelInteraction,
                'Invalid channel selected.',
                true,
              );

            await updateBotChannel(
              guildId,
              selectedChannel as BotChannel,
              newChannel.id,
            );

            logger.info(
              `Set ${selectedChannel} channel to ${newChannel.id} for ${guildId}`,
              scope,
            );

            await channelInteraction.update({
              content: `The ${selectedChannel} channel has been set to <#${newChannel.id}>.`,
              components: [],
            });

            channelCollector.stop();
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          channelCollector.on('end', async (collected) => {
            if (collected.size === 0) {
              await interaction.followUp({
                content: 'Channel selection timed out.',
                flags: MessageFlags.Ephemeral,
              });
            }
          });

          buttonCollector.stop();
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      buttonCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          await interaction.followUp({
            content: 'No action selected in time.',
            flags: MessageFlags.Ephemeral,
          });
        }
      });

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      menuCollector.on('end', async (collected) => {
        if (collected.size === 0) {
          await interaction.editReply({
            content: 'Menu timed out.',
            components: [],
          });
        }
      });
    });
  }
}
