import {
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
} from 'discord.js';
import {
  createButton,
  safeReply,
  createButtonsRow,
  TIMES_MILISECONDS,
} from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { getAllowBackup, toggleAllowBackup } from '../../../database/guild.ts';

export class BackupCommand extends BotCommand {
  name = 'backups';
  description = 'Change if backups are allowed or not';
  guildOnly = true;
  permissionLevel = 'admin' as const;
  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    // this is a garuanteed since its handled in the validation
    const currentStatus = await getAllowBackup(interaction.guildId as string);

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
          return await safeReply(buttonInteraction, 'Invalid action.', true);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    collector.on('end', async () => {
      await interaction.editReply({ components: [] });
    });
  }
}
