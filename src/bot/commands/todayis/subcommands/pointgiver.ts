import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { safeReply } from '../../../../core/utils/editAndReply.ts';
import { logWithTime } from '../../../../core/utils/logging.ts';
import { getGuild } from '../../../database/guild.ts';
import { setPointGiverOfGuild } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { PermissionLevel } from '../../../../core/types/permission.ts';
import { userOption } from '../../../../core/utils/slashCommandOptions.ts';

const scope = 'todayis_pointgiver';

export class PointgiverCommand extends BotCommand {
  name = 'pointgiver';
  description = 'Set the servers pointgiver (admin only)';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'admin';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const guild = await getGuild(interaction.guildId);

    if (!guild) {
      await safeReply(
        interaction,
        `Guild is not in the database. You should never see this message, contact the bot owner please.`,
      );
      return;
    }

    const targetUser = interaction.options.getUser('target');

    if (!targetUser) {
      await safeReply(interaction, 'No target user was provided.');
      return;
    }

    await setPointGiverOfGuild(interaction.guildId as string, targetUser.id);
    await safeReply(
      interaction,
      guild.todayIsChannelId
        ? `set <@${targetUser.id}> as the server's point giver`
        : `set <@${targetUser.id}> as the server's point giver. Dont forget to also set a todayIs channel!`,
    );
    logWithTime(
      `Set ${targetUser.id} as pointgiver for ${guild.guildId}`,
      'info',
      scope,
    );
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder.addUserOption(
      userOption('target', 'The user put as point giver'),
    );
  }
}
