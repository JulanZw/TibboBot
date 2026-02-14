import {
  ChatInputCommandInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discord-framework';

import { getUser, insertUserData } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { optIn } from '../../../utils/managers/optInOutManager.ts';

export class OptInCommand extends BotCommand {
  name = 'in';
  description =
    'Allows collection of message counts and similar stats for your account.';
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = await getUser(interaction.user.id);
    if (!user) {
      await insertUserData(interaction.user.id, BigInt(0), 0, BigInt(0), false);
    } else if (!user.optedout) {
      await safeReply(interaction, 'You have already opted in!');
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
      `Are you sure you want to opt in?\nThis will allow data collection for this account.`,
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
  }
}
