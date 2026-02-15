import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  ModalSubmitInteraction,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discord-framework';

import { deleteAllBirthdaysForUser } from '../../../database/birthday.ts';
import { removeAllPointgiverRolesForUser } from '../../../database/guild.ts';
import { deleteAllRemindersForUser } from '../../../database/reminders.ts';
import { deleteUserStats } from '../../../database/stats.ts';
import { getUser, insertUserData, deleteUser } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import {
  showConfirmModal,
  handleConfirmModal,
} from '../../../utils/confirmation.ts';
import { optOut } from '../../../utils/managers/optInOutManager.ts';
import { logger } from '../../../index.ts';

const scope = 'opt';

export class OptOutCommand extends BotCommand {
  name = 'out';
  description =
    'Stops collection of message counts and similar stats for your account.';
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await getUser(interaction.user.id);
    if (!user) {
      await insertUserData(interaction.user.id, BigInt(0), 0, BigInt(0), false);
    } else if (user.optedout) {
      await safeReply(interaction, 'You have already opted out!');
      return;
    }

    const buttons = [
      new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    ];

    await safeReply(
      interaction,
      `Are you sure you want to opt out?\nThis will prevent any data collection for this account.`,
      false,
      [],
      [new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons)],
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
            new ButtonBuilder()
              .setCustomId('yes')
              .setLabel('Yes')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('no')
              .setLabel('No')
              .setStyle(ButtonStyle.Success),
          ];

          await btn.update({
            content: `You have now opted out!\nDo you also want to remove all of your currently stored data? (This is optional)`,
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                ...purgeButtons,
              ),
            ],
          });
          return;
        }
        case 'yes': {
          collector.stop();
          await showConfirmModal(
            btn,
            'purge_user_confirm_modal',
            async (modalInteraction: ModalSubmitInteraction) => {
              const confirmed = await handleConfirmModal(modalInteraction);
              if (confirmed) {
                const userId = modalInteraction.user.id;

                await deleteUserStats(userId);
                const deletedBirthdays =
                  await deleteAllBirthdaysForUser(userId);
                logger.info(`Removed all birthdays for user: ${userId}`, scope);
                const deletedReminders =
                  await deleteAllRemindersForUser(userId);
                logger.info(`Removed all reminders for user: ${userId}`, scope);
                const deletedPointGiverRoles =
                  await removeAllPointgiverRolesForUser(userId);
                logger.info(
                  `Removed all pointgiver roles for user: ${userId}`,
                  scope,
                );
                await deleteUser(userId);
                logger.info(`Deleted user: ${userId}`, scope);

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
  }
}
