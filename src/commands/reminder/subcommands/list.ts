import { Reminders, $Enums } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ModalSubmitInteraction,
  TextInputStyle,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  embedBuilder,
  capitalizeFirst,
  formatDateToDDMMYYYY,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discordjs-framework';

import {
  getUserReminders,
  deleteReminder,
  updateReminder,
} from '../../../database/reminders.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { scheduleReminder } from '../../../utils/managers/reminderManager.ts';
import { parseDurationOrDateString } from '../../../utils/parsers.ts';
import { modalManager } from '../../../utils/globals.ts';
import { logger } from '../../../index.ts';

const scope = 'reminder_list';

export class ListRemindersCommand extends BotCommand {
  name = 'list';
  description = 'List and manage your reminders';
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const reminders = await getUserReminders(interaction.user.id);
    if (!reminders.length) {
      await safeReply(interaction, 'You have no reminders.', true);
      return;
    }

    let index = 0;
    const userId = interaction.user.id;

    const buildEmbed = (reminder: Reminders, reminderIndex: number) => [
      embedBuilder({
        title: `Reminder ${reminderIndex + 1} of ${reminders.length}`,
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

    const buildButtons = (length: number, buttonIndex: number) => {
      const normalButtons = [
        new ButtonBuilder()
          .setCustomId('edit')
          .setLabel('Edit')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('delete')
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger),
      ];

      const paginationButtons = [
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('Previous')
          .setDisabled(buttonIndex === 0)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('Next')
          .setDisabled(buttonIndex === length - 1)
          .setStyle(ButtonStyle.Secondary),
      ];

      return [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          ...normalButtons,
          ...paginationButtons,
        ),
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
    collector.on('collect', async (btnInteraction) => {
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
          const buttons = [
            new ButtonBuilder()
              .setCustomId('confirm')
              .setLabel('Confirm')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary),
          ];

          await btnInteraction.update({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
            ],
          });
          break;
        }

        case 'confirm': {
          await deleteReminder(reminders[index].id);
          reminders.splice(index, 1);
          if (!reminders.length) {
            await btnInteraction.update({
              content: 'All reminders deleted.',
              embeds: [],
              components: [],
            });
            collector.stop();
            return;
          }

          index = Math.min(index, reminders.length - 1);
          break;
        }

        case 'cancel': {
          break;
        }

        case 'edit': {
          const reminder = reminders[index];
          const modal = modalManager.buildAndRegister({
            id: `editReminderModal`,
            ephemeral: true,
            title: 'Edit Reminder',
            fields: [
              {
                customId: 'editMessage',
                name: 'Reminder Message',
                style: TextInputStyle.Paragraph,
                required: true,
                value: reminder.message,
              },
              {
                customId: 'editTime',
                name: 'Remind at (e.g. in 2 hours or in 3 days).',
                style: TextInputStyle.Short,
                required: false,
              },
              {
                customId: 'editRepeat',
                name: 'Repeat? (Daily, Weekly, None)',
                style: TextInputStyle.Short,
                required: true,
                value: capitalizeFirst(reminder.remindInterval),
              },
            ],
            onSubmit: async (modalInteraction: ModalSubmitInteraction) => {
              const editMessage =
                modalInteraction.fields.getTextInputValue('editMessage');
              const editTime =
                modalInteraction.fields.getTextInputValue('editTime');
              const editRepeat =
                modalInteraction.fields.getTextInputValue('editRepeat');

              const updateRepeat =
                editRepeat && editRepeat.toUpperCase() in $Enums.Intervals
                  ? $Enums.Intervals[
                      editRepeat.toUpperCase() as keyof typeof $Enums.Intervals
                    ]
                  : $Enums.Intervals.NONE;

              if (reminder.userId !== modalInteraction.user.id) {
                return await safeReply(modalInteraction, 'Unauthorized.', true);
              }

              let newRemindAt: Date;

              if (editTime) {
                const parsed = parseDurationOrDateString(editTime);

                if (!parsed || parsed < new Date()) {
                  return await safeReply(
                    modalInteraction,
                    'Invalid or past date.',
                    true,
                  );
                }

                newRemindAt = parsed;
              } else {
                newRemindAt = reminder.remindAt;
              }

              const editedReminder = await updateReminder(
                reminder.id,
                editMessage,
                newRemindAt,
                updateRepeat,
              );

              scheduleReminder(modalInteraction.user, editedReminder);

              return await safeReply(
                modalInteraction,
                `Reminder updated!\n**New Message:** ${editMessage}\n**New Time:** <t:${Math.floor(newRemindAt.getTime() / 1000)}:F>\n**Repeat:** ${capitalizeFirst(updateRepeat)}`,
                true,
              );
            },
          });
          return await btnInteraction.showModal(modal);
        }

        default:
          return await safeReply(btnInteraction, 'Invalid action.', true);
      }

      if (action !== 'delete') {
        await btnInteraction.update({
          embeds: buildEmbed(reminders[index], index),
          components: buildButtons(reminders.length, index),
        });
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (err: any) {
        logger.warn(
          `Could not edit message after collector ended: ${err}`,
          scope,
        );
      }
    });
  }
}
