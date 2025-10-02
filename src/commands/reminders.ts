import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
  ComponentType,
  ButtonInteraction,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { $Enums, Reminders } from '@prisma/client';

import { stringOption } from '../utils/slashCommandOptions.ts';
import {
  commandBuilder,
  safeReply,
  scheduleReminder,
} from '../utils/general.ts';
import { logWithTime } from '../utils/logging.ts';
import { parseDurationOrDateString } from '../utils/parsers.ts';
import {
  embedBuilder,
  createButtonsRow,
  createButton,
  createPaginationButtons,
} from '../utils/embeds.ts';
import { capitalizeFirst, formatDateToDDMMYYYY } from '../utils/formatting.ts';
import { Subcommand } from '../utils/typesAndInterfaces.ts';
import {
  createReminder,
  deleteReminder,
  getUserReminders,
} from '../database/reminders.ts';
import { TIMES_MILISECONDS } from '../utils/globals.ts';
import { hasOptedOut } from '../utils/optInOut.ts';

const scope = 'reminder';

export const reminderCommands = commandBuilder({
  name: 'reminder',
  description: 'All commands related to your reminders',
  subcommands: new Map<string, Subcommand>([
    [
      'add',
      {
        name: 'add',
        description: 'Set a new reminder',
        async execute(interaction: ChatInputCommandInteraction) {
          if (hasOptedOut(interaction.user.id)) {
            return await safeReply(
              interaction,
              'You have opted out of data collection, so you cannot create a reminder.',
            );
          }
          const when = interaction.options.getString('when', true);
          const message = interaction.options.getString('message', true);
          const repeat = interaction.options.getString('repeat', false);

          const targetTime = parseDurationOrDateString(when);
          if (!targetTime) {
            return await safeReply(
              interaction,
              'Invalid date/time format.',
              true,
            );
          }

          const maxTime = Date.now() + 1000 * 60 * 60 * 24 * 365;
          if (targetTime.getTime() > maxTime) {
            return await safeReply(
              interaction,
              'Reminders can only be up to 1 year in the future.',
              true,
            );
          }

          const userReminders = await getUserReminders(interaction.user.id);
          if (userReminders.length > 10) {
            return await safeReply(
              interaction,
              'You cannot have more than 10 reminders!',
              true,
            );
          }

          const reminder = await createReminder(
            interaction.user.id,
            message,
            targetTime,
            repeat && repeat in $Enums.Intervals
              ? $Enums.Intervals[repeat as keyof typeof $Enums.Intervals]
              : $Enums.Intervals.NONE,
          );

          const maxScheduleDate = new Date();
          maxScheduleDate.setDate(maxScheduleDate.getDate() + 1);
          if (targetTime < maxScheduleDate) {
            scheduleReminder(interaction.user, reminder);
          }

          await safeReply(
            interaction,
            `Reminder set for <t:${Math.floor(targetTime.getTime() / 1000)}:F>, make sure you have direct messages turned on for this server!`,
          );
          logWithTime(
            `Created reminder for ${interaction.user.id} on ${targetTime.toISOString()}`,
            'info',
            scope,
          );
        },
        customize: (builder: SlashCommandSubcommandBuilder) => {
          return builder
            .addStringOption(
              stringOption('when', 'When you need to be reminded', true),
            )
            .addStringOption(
              stringOption('message', 'What you need to be reminded of', true),
            )
            .addStringOption((option) =>
              option
                .setName('repeat')
                .setDescription('How often to repeat this reminder')
                .addChoices(
                  { name: 'Daily', value: $Enums.Intervals.DAILY },
                  { name: 'Weekly', value: $Enums.Intervals.WEEKLY },
                )
                .setRequired(false),
            );
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
    [
      'list',
      {
        name: 'list',
        description: 'List and manage your reminders',
        async execute(interaction: ChatInputCommandInteraction) {
          const reminders = await getUserReminders(interaction.user.id);
          if (!reminders.length) {
            return await safeReply(interaction, 'You have no reminders.', true);
          }

          let index = 0;
          const userId = interaction.user.id;

          const buildEmbed = (reminder: Reminders, index: number) => [
            embedBuilder({
              title: `Reminder ${index + 1} of ${reminders.length}`,
              fields: [
                { name: 'Message', value: reminder.message },
                {
                  name: 'Remind At',
                  value: `<t:${Math.floor(reminder.remindAt.getTime() / 1000)}:F>`,
                },
                ...(reminder.remindInterval === $Enums.Intervals.NONE
                  ? []
                  : [
                      {
                        name: 'Repeating',
                        value: capitalizeFirst(reminder.remindInterval),
                      },
                    ]),
              ],
              footer: `Created: ${formatDateToDDMMYYYY(reminder.createdAt)}`,
            }),
          ];

          const buildButtons = (length: number, index: number) => {
            const normalButtons = [
              createButton({ type: 'edit' }),
              createButton({ type: 'delete' }),
            ];

            const paginationButtons = createPaginationButtons(index, length);

            return [
              createButtonsRow(normalButtons, {
                buttons: paginationButtons,
                location: 'embrace',
              }),
            ];
          };

          await safeReply(
            interaction,
            '',
            false,
            buildEmbed(reminders[index], index),
            buildButtons(reminders.length, index),
          );

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: TIMES_MILISECONDS.MINUTE * 2,
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('collect', async (btnInteraction: ButtonInteraction) => {
            if (btnInteraction.user.id !== userId) {
              return await safeReply(
                btnInteraction,
                'You cannot use this button.',
                true,
              );
            }

            const action = btnInteraction.customId;

            switch (action) {
              case 'prev':
                index = Math.max(0, index - 1);
                break;

              case 'next':
                index = Math.min(reminders.length - 1, index + 1);
                break;

              case 'delete': {
                await deleteReminder(reminders[index].id);
                reminders.splice(index, 1);

                if (!reminders.length) {
                  collector.stop();
                  return await btnInteraction.update({
                    content: 'All reminders deleted.',
                    embeds: [],
                  });
                }

                index = Math.min(index, reminders.length - 1);
                break;
              }

              case 'edit': {
                const reminder = reminders[index];
                const modal = new ModalBuilder()
                  .setCustomId(`editReminderModal:${reminder.id}`)
                  .setTitle('Edit Reminder')
                  .addComponents(
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId('editMessage')
                        .setLabel('Reminder Message')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                        .setValue(reminder.message),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId('editTime')
                        .setLabel('Remind at (e.g. in 2 hours or in 3 days).')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId('editRepeat')
                        .setLabel('Repeat? (Daily, Weekly, None)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue(capitalizeFirst(reminder.remindInterval)),
                    ),
                  );
                return await btnInteraction.showModal(modal);
              }

              default:
                return await safeReply(btnInteraction, 'Invalid action.', true);
            }

            await btnInteraction.update({
              embeds: buildEmbed(reminders[index], index),
              components: buildButtons(reminders.length, index),
            });
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            try {
              await interaction.editReply({ components: [] });
            } catch (err: any) {
              logWithTime(
                `Could not edit message after collector ended: ${err}`,
                'warn',
                scope,
              );
            }
          });
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
  ]),
});

export default reminderCommands;
