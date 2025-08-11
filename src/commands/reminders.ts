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
import { $Enums } from '@prisma/client';

import { stringOption } from '../utils/slashCommandOptions';
import { commandBuilder, safeReply, scheduleReminder } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { parseDurationOrDateString } from '../utils/parsers';
import { embedBuilder, createButtonsRow } from '../utils/embeds';
import { formatDateToDDMMYYYY } from '../utils/formatting';
import { Subcommand } from '../utils/typesAndInterfaces';
import {
  createReminder,
  deleteReminder,
  getUserReminders,
} from '../database/reminders';

export const reminderCommands = commandBuilder(
  'reminders',
  'All commands related to your reminders',
  async () => {},
  false,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'add',
      {
        name: 'add',
        description: 'Set a new reminder',
        async execute(interaction: ChatInputCommandInteraction) {
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
            true,
          );
          logWithTime(
            `Created reminder for ${interaction.user.id} on ${targetTime.toISOString()}`,
            'info',
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
          let deletedAll = false;
          const reminders = await getUserReminders(interaction.user.id);
          if (!reminders.length) {
            return await safeReply(interaction, 'You have no reminders.', true);
          }

          let index = 0;
          const userId = interaction.user.id;

          const buildEmbed = (
            reminder: {
              createdAt: Date;
              id: string;
              message: string;
              userId: string;
              remindAt: Date;
            },
            index: number,
          ) =>
            embedBuilder({
              title: `Reminder ${index + 1} of ${reminders.length}`,
              fields: [
                { name: 'Message', value: reminder.message },
                {
                  name: 'Remind At',
                  value: `<t:${Math.floor(reminder.remindAt.getTime() / 1000)}:F>`,
                },
              ],
              footer: `Created: ${formatDateToDDMMYYYY(reminder.createdAt)}`,
            });

          const buildComponents = () => [
            createButtonsRow(index, reminders.length),
          ];

          await safeReply(
            interaction,
            '',
            true,
            [buildEmbed(reminders[index], index)],
            buildComponents(),
          );

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
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
                  deletedAll = true;
                  collector.stop();
                  return await btnInteraction.update({
                    content: 'All reminders deleted.',
                    embeds: [],
                    components: [],
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
                        .setLabel('Remind at (e.g. in 2 hours or in 3 days)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true),
                    ),
                    new ActionRowBuilder<TextInputBuilder>().addComponents(
                      new TextInputBuilder()
                        .setCustomId('editRepeat')
                        .setLabel('Repeat? (Daily, Weekly, None)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue(reminder.remindInterval.toLowerCase()),
                    ),
                  );

                return await btnInteraction.showModal(modal);
              }

              default:
                return await safeReply(btnInteraction, 'Invalid action.', true);
            }

            await btnInteraction.update({
              embeds: [buildEmbed(reminders[index], index)],
              components: buildComponents(),
            });
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            if (deletedAll) return;
            if (msg.editable) {
              try {
                await msg.edit({ components: [] });
              } catch (err: any) {
                logWithTime(
                  `Could not edit message after collector ended: ${err}`,
                  'warn',
                );
              }
            }
          });
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
  ]),
);
