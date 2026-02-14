import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  logWithTime,
  stringOption,
  channelOption,
} from '@julanzw/ttoolbox-discord-framework';

import { pendingReactionRoleSetups } from '../../../utils/globals.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';

const scope = 'reaction_create';

export class CreateReactionCommand extends BotCommand {
  name = 'create';
  description = 'Create a reaction role message';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'admin';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.user.id;

    const targetChannel = interaction.options.getChannel('target');
    const title = interaction.options.getString('title');

    if (!targetChannel) {
      await safeReply(interaction, 'No target channel was provided.');
      return;
    }

    pendingReactionRoleSetups.set(userId, {
      interaction,
      emojiRoleMap: {},
      channelId: interaction.channelId,
      targetChannelId: targetChannel.id,
      title: title || 'Choose your role',
      messageIds: [],
    });

    await safeReply(
      interaction,
      'Please send the emoji + role pairs in this format: `🟥 @RedTeam`\nSend `done` when finished.',
      true,
    );
    logWithTime('Reaction message process started', 'info', scope);
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder
      .addChannelOption(
        channelOption(
          'target',
          'The channel where reaction message will be in.',
          true,
        ),
      )
      .addStringOption(
        stringOption(
          'title',
          'The title of the reaction role message (defaults to "Choose your role")',
          false,
        ),
      );
  }
}
