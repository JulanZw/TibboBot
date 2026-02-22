import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  userOption,
} from '@julanzw/ttoolbox-discordjs-framework';

import { getUserCharsAndMessages } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { hasOptedOut } from '../../../utils/managers/optInOutManager.ts';

export class UserCommand extends BotCommand {
  name = 'user';
  description = 'Show the amount of messages and characters someone sent';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('target');

    if (!targetUser) {
      await safeReply(interaction, 'No target user was provided.');
      return;
    }

    if (hasOptedOut(targetUser.id)) {
      await safeReply(
        interaction,
        'This user has opted out of data collection.',
      );
      return;
    }

    const user = await getUserCharsAndMessages(targetUser.id);
    if (user) {
      await safeReply(
        interaction,
        `User ${targetUser.username} has sent ${user.char_count} character(s) in ${user.msg_count} message(s).`,
      );
    } else {
      await safeReply(
        interaction,
        `User ${targetUser.username} has not sent any messages yet.`,
      );
    }
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder.addUserOption(userOption('target', 'The user to check'));
  }
}
