import {
  ChatInputCommandInteraction,
  ModalSubmitInteraction,
} from 'discord.js';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { safeReply } from '../../../../core/utils/editAndReply.ts';
import { getGuild, deleteGuild } from '../../../database/guild.ts';
import {
  showConfirmModal,
  handleConfirmModal,
} from '../../../utils/discord/confirmation.ts';
import { logWithTime } from '../../../../core/utils/logging.ts';

const scope = 'manage_data';

export class DataCommand extends BotCommand {
  name = 'data';
  description = 'Removes all the data of the guild.';
  guildOnly = true;
  permissionLevel = 'admin' as const;
  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = await getGuild(interaction.guild!.id);
    if (!guild) {
      await safeReply(interaction, 'Guild is not in the database.', true);
      return;
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
          logWithTime(`Deleted guild: ${modalGuild.guildId}`, 'info', scope);

          await safeReply(
            modalInteraction,
            `**Deleted:**\nGuild: ${modalGuild.guildId}`,
          );
        }
      },
    );
  }
}
