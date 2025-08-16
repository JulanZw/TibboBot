import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
} from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { getBotChannel, updateBotChannel } from '../database/guild';
import { BotChannel, Subcommand } from '../utils/typesAndInterfaces';

const scope = 'manage';

export const manageChannelsCommand = commandBuilder(
  'manage',
  'All commands related to managing things for the bot inside the guild',
  async () => {},
  true,
  'admin',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'channels',
      {
        name: 'channels',
        description: 'A command to manage the game channels',
        async execute(interaction) {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const guildId = interaction.guildId;

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

            const buttonRow =
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`set_${selected}`)
                  .setLabel('Set')
                  .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                  .setCustomId(`reset_${selected}`)
                  .setLabel('Reset')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId(`cancel`)
                  .setLabel('Cancel')
                  .setStyle(ButtonStyle.Secondary),
              );

            const existingBotChannel = await getBotChannel(
              guildId,
              selected as BotChannel,
            );

            await menuInteraction.update({
              content: existingBotChannel
                ? `You selected: **${selected}**.\nCurrent channel: <#${existingBotChannel}>\nChoose an action:`
                : `You selected: **${selected}**.\nCurrent channel: [not set]\nChoose an action:`,
              components: [buttonRow],
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
              const [action, selected] = buttonInteraction.customId.split('_');

              if (action === 'cancel') {
                await buttonInteraction.update({
                  content: 'Action cancelled.',
                  components: [],
                });
                return buttonCollector.stop();
              } else if (action === 'reset') {
                await updateBotChannel(guildId, selected as BotChannel, null);
                logWithTime(
                  `Reset ${selected} channel for ${guildId}`,
                  'info',
                  scope,
                );
                await buttonInteraction.update({
                  content: `${selected} channel reset.`,
                  components: [],
                });
                return buttonCollector.stop();
              } else {
                const channelSelect =
                  new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
                    new ChannelSelectMenuBuilder()
                      .setCustomId(`choose_${selected}`)
                      .setPlaceholder('Select a channel')
                      .addChannelTypes(ChannelType.GuildText),
                  );

                const channelMsg = await buttonInteraction.update({
                  content: 'Pick a new channel below:',
                  components: [channelSelect],
                });

                const channelCollector =
                  channelMsg.createMessageComponentCollector({
                    filter: (i) =>
                      i.user.id === interaction.user.id &&
                      i.customId === `choose_${selected}`,
                    componentType: ComponentType.ChannelSelect,
                    time: 60000,
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
                    selected as BotChannel,
                    newChannel.id,
                  );

                  logWithTime(
                    `Set ${selected} channel to ${newChannel.id} for ${guildId}`,
                    'info',
                    scope,
                  );

                  await channelInteraction.update({
                    content: `The ${selected} channel has been set to <#${newChannel.id}>.`,
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
        },
        customize: (builder) => {
          return builder;
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
);
