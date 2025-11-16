import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  MessageFlags,
  ModalSubmitInteraction,
} from 'discord.js';

import { safeReply } from '../utils/discord/editAndReply.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';
import { logWithTime } from '../utils/logging.ts';
import {
  deleteGuild,
  getAllowBackup,
  getBotChannel,
  getGuild,
  toggleAllowBackup,
  updateBotChannel,
} from '../database/guild.ts';
import { TIMES_MILISECONDS } from '../utils/globals.ts';
import {
  handleConfirmModal,
  showConfirmModal,
} from '../utils/discord/confirmation.ts';
import { createButton, createButtonsRow } from '../utils/discord/embeds.ts';
import { BotChannel } from '../types/channel.ts';
import { Subcommand } from '../types/commands.ts';

const scope = 'manage';

const manageChannelsCommand = commandBuilder({
  name: 'manage',
  description:
    'All commands related to managing things for the bot inside the guild',
  subcommands: new Map<string, Subcommand>([
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
              const [action, selectedChannel] =
                buttonInteraction.customId.split('_');

              if (action === 'cancel') {
                await buttonInteraction.update({
                  content: 'Action cancelled.',
                  components: [],
                });
                return buttonCollector.stop();
              } else if (action === 'reset') {
                await updateBotChannel(
                  guildId,
                  selectedChannel as BotChannel,
                  null,
                );
                logWithTime(
                  `Reset ${selectedChannel} channel for ${guildId}`,
                  'info',
                  scope,
                );
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

                const channelCollector =
                  channelMsg.createMessageComponentCollector({
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

                  logWithTime(
                    `Set ${selectedChannel} channel to ${newChannel.id} for ${guildId}`,
                    'info',
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
        },
        customize: (builder) => {
          return builder;
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
    [
      'backups',
      {
        name: 'backups',
        description: 'Change if backups are allowed or not',
        execute: async (interaction) => {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const currentStatus = await getAllowBackup(interaction.guildId);

          const buttons = [
            createButton({
              type: 'toggle',
              label: 'Toggle',
              style: ButtonStyle.Primary,
            }),
            createButton({
              type: 'cancel',
              label: 'Cancel',
              style: ButtonStyle.Secondary,
            }),
          ];

          await safeReply(
            interaction,
            `Currently backups in the server are: \`${currentStatus ? 'on' : 'off'}\``,
            false,
            [],
            [createButtonsRow(buttons)],
          );

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIMES_MILISECONDS.MINUTE,
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
              case 'toggle':
                await toggleAllowBackup(interaction.guildId as string);
                await buttonInteraction.update({
                  content: `Backups in the server are now turned: \`${!currentStatus ? 'on' : 'off'}\``,
                  components: [],
                });
                return collector.stop();
              case 'cancel':
                await buttonInteraction.update({
                  content: 'Action cancelled.',
                  components: [],
                });
                return collector.stop();
              default:
                return await safeReply(
                  buttonInteraction,
                  'Invalid action.',
                  true,
                );
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            await interaction.editReply({ components: [] });
          });
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
    [
      'data',
      {
        name: 'data',
        description: 'Removes all the data of the guild.',
        async execute(interaction) {
          const guild = await getGuild(interaction.guild!.id);
          if (!guild) {
            return await safeReply(
              interaction,
              'Guild is not in the database.',
              true,
            );
          }

          await showConfirmModal(
            interaction,
            'purge_guild_confirm_modal',
            async (modalInteraction: ModalSubmitInteraction) => {
              const confirmed = await handleConfirmModal(modalInteraction);
              if (confirmed) {
                const modalGuild = await getGuild(modalInteraction.guild!.id);
                if (!modalGuild) {
                  return await safeReply(
                    modalInteraction,
                    'Guild is not in the database.',
                    true,
                  );
                }

                await deleteGuild(modalGuild.guildId);
                logWithTime(
                  `Deleted guild: ${modalGuild.guildId}`,
                  'info',
                  scope,
                );

                await safeReply(
                  modalInteraction,
                  `**Deleted:**\nGuild: ${modalGuild.guildId}`,
                );
              }
            },
          );
        },
        customize: (builder) => builder,
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
});

export default manageChannelsCommand;
