import { ButtonStyle, ComponentType, ModalSubmitInteraction } from 'discord.js';

import { deleteUser, getUser, insertUserData } from '../../database/user.ts';
import {
  handleConfirmModal,
  showConfirmModal,
} from '../../utils/discord/confirmation.ts';
import { createButton, createButtonsRow } from '../../utils/discord/embeds.ts';
import { safeReply } from '../../utils/discord/editAndReply.ts';
import { TIMES_MILISECONDS } from '../../utils/globals.ts';
import { optIn, optOut } from '../../utils/managers/optInOutManager.ts';
import { deleteAllBirthdaysForUser } from '../../database/birthday.ts';
import { removeAllPointgiverRolesForUser } from '../../database/guild.ts';
import { deleteAllRemindersForUser } from '../../database/reminders.ts';
import { logWithTime } from '../../utils/logging.ts';
import { Subcommand } from '../../types/commands.ts';
import { commandBuilder } from '../../utils/discord/commandBuilder.ts';
import { deleteUserStats } from '../../database/stats.ts';

const scope = 'opt';

const optoutCommand = commandBuilder({
  name: 'opt',
  description: 'The commands for opting in and out of data collection',
  subcommands: new Map<string, Subcommand>([
    [
      'out',
      {
        name: 'out',
        description:
          'Stops collection of message counts and similar stats for your account.',
        execute: async function (interaction) {
          const user = await getUser(interaction.user.id);
          if (!user) {
            await insertUserData(
              interaction.user.id,
              BigInt(0),
              0,
              BigInt(0),
              false,
            );
          } else if (user.optedout) {
            return await safeReply(interaction, 'You have already opted out!');
          }

          const buttons = [
            createButton({
              type: 'confirm',
              label: 'Confirm',
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
            `Are you sure you want to opt out?\nThis will prevent any data collection for this account.`,
            false,
            [],
            [createButtonsRow(buttons)],
          );

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIMES_MILISECONDS.MINUTE * 2,
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('collect', async (btn) => {
            if (btn.user.id !== interaction.user.id) {
              return await safeReply(btn, 'You cannot use this button.', true);
            }

            switch (btn.customId) {
              case 'cancel': {
                await btn.update({
                  content: 'Opt-out cancelled.',
                  components: [],
                });
                collector.stop();
                return;
              }
              case 'confirm': {
                await optOut(interaction.user.id);

                const purgeButtons = [
                  createButton({
                    type: 'yes',
                    label: 'Yes',
                    style: ButtonStyle.Danger,
                  }),
                  createButton({
                    type: 'no',
                    label: 'No',
                    style: ButtonStyle.Success,
                  }),
                ];

                await btn.update({
                  content: `You have now opted out!\nDo you also want to remove all of your currently stored data? (This is optional)`,
                  components: [createButtonsRow(purgeButtons)],
                });
                return;
              }
              case 'yes': {
                collector.stop();
                await showConfirmModal(
                  btn,
                  'purge_user_confirm_modal',
                  async (modalInteraction: ModalSubmitInteraction) => {
                    const confirmed =
                      await handleConfirmModal(modalInteraction);
                    if (confirmed) {
                      const userId = modalInteraction.user.id;

                      await deleteUserStats(userId);
                      const deletedBirthdays =
                        await deleteAllBirthdaysForUser(userId);
                      logWithTime(
                        `Removed all birthdays for user: ${userId}`,
                        'info',
                        scope,
                      );
                      const deletedReminders =
                        await deleteAllRemindersForUser(userId);
                      logWithTime(
                        `Removed all reminders for user: ${userId}`,
                        'info',
                        scope,
                      );
                      const deletedPointGiverRoles =
                        await removeAllPointgiverRolesForUser(userId);
                      logWithTime(
                        `Removed all pointgiver roles for user: ${userId}`,
                        'info',
                        scope,
                      );
                      await deleteUser(userId);
                      logWithTime(`Deleted user: ${userId}`, 'info', scope);

                      await safeReply(
                        modalInteraction,
                        `**Deleted:**\nBirthdays: ${deletedBirthdays.count}\nReminders: ${deletedReminders.count}${
                          deletedPointGiverRoles.count > 0
                            ? `\nPointgiver roles: ${deletedPointGiverRoles.count}`
                            : ''
                        }`,
                      );
                    }
                  },
                );
                return;
              }
              case 'no': {
                await btn.update({
                  content:
                    'Opt-out complete. Your existing data was kept but no more will be collected.',
                  components: [],
                });
                collector.stop();
                return;
              }
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            await interaction.editReply({ components: [] });
          });
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
    [
      'in',
      {
        name: 'in',
        description:
          'Allows collection of message counts and similar stats for your account.',
        execute: async function (interaction) {
          const user = await getUser(interaction.user.id);
          if (!user) {
            await insertUserData(
              interaction.user.id,
              BigInt(0),
              0,
              BigInt(0),
              false,
            );
          } else if (!user.optedout) {
            return await safeReply(interaction, 'You have already opted in!');
          }

          const buttons = [
            createButton({
              type: 'confirm',
              label: 'Confirm',
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
            `Are you sure you want to opt in?\nThis will allow data collection for this account.`,
            false,
            [],
            [createButtonsRow(buttons)],
          );

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIMES_MILISECONDS.MINUTE * 2,
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('collect', async (btn) => {
            if (btn.user.id !== interaction.user.id) {
              return await safeReply(btn, 'You cannot use this button.', true);
            }

            const action = btn.customId;

            switch (action) {
              case 'cancel': {
                await btn.update({
                  content: 'Opt-in cancelled.',
                  components: [],
                });
                collector.stop();
                return;
              }
              case 'confirm': {
                await optIn(interaction.user.id);
                await btn.update({
                  content: `You have now opted in!`,
                  components: [],
                });
                return collector.stop();
              }
              default: {
                return await safeReply(btn, 'Invalid action.', true);
              }
            }
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            await interaction.editReply({ components: [] });
          });
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
  ]),
});

export default optoutCommand;
