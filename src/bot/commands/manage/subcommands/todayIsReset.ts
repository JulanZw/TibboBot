import {
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
} from 'discord.js';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import {
  getYearlyTodayIsReset,
  toggleYearlyTodayIsReset,
} from '../../../database/guild.ts';
import { safeReply } from '../../../../core/utils/editAndReply.ts';
import {
  createButton,
  createButtonsRow,
} from '../../../../core/utils/embeds.ts';
import { TIMES_MILISECONDS } from '../../../../core/utils/miliseconds.ts';

export class TodayIsResetCommand extends BotCommand {
  name = 'todayis_reset';
  description =
    'Toggles whether the today-is stats reset yearly or not for this server.';
  guildOnly = true;
  permissionLevel = 'admin' as const;
  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    // this is a garuanteed since its handled in the validation
    const currentStatus = await getYearlyTodayIsReset(
      interaction.guildId as string,
    );

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
      `Currently the yearly today-is reset in the server is: \`${currentStatus ? 'on' : 'off'}\``,
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
          await toggleYearlyTodayIsReset(interaction.guildId as string);
          await buttonInteraction.update({
            content: `Yearly today-is reset in the server is now turned: \`${!currentStatus ? 'on' : 'off'}\``,
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
          return await safeReply(buttonInteraction, 'Invalid action.', true);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async () => {
      await interaction.editReply({ components: [] });
    });
  }
}
