import { ButtonStyle, ComponentType } from 'discord.js';

import { getUser, insertUserData } from '../database/user.ts';
import { showConfirmModal } from '../utils/confirmation.ts';
import { createButton, createButtonsRow } from '../utils/embeds.ts';
import { commandBuilder, safeReply } from '../utils/general.ts';
import { TIMES_MILISECONDS } from '../utils/globals.ts';
import { optIn, optOut } from '../utils/optInOut.ts';
import { Subcommand } from '../utils/typesAndInterfaces.ts';

export const optoutCommand = commandBuilder({
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
                await btn.update({ components: [] });
                collector.stop();
                await showConfirmModal(btn, 'purge_user_confirm_modal');
                return;
              }
              case 'no': {
                await btn.update({
                  content: 'Opt-out complete. Your existing data was kept.',
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
