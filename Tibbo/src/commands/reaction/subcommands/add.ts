import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  PermissionLevel,
  logWithTime,
  embedBuilder,
  stringOption,
  safeReply,
  roleOption,
} from '@julanzw/ttoolbox-discord-framework';

import {
  getReactionRolesByMessage,
  addReactionRole,
} from '../../../database/reactionRoles.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';

const scope = 'reaction_add';

export class AddReactionCommand extends BotCommand {
  name = 'add';
  description =
    'Adds a reaction role to a message after creating a reaction role message.';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'admin';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetMessageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');

    if (!targetMessageId) {
      await safeReply(interaction, 'No target message ID was provided.');
      return;
    } else if (!emoji) {
      await safeReply(interaction, 'No emoji was provided.');
      return;
    } else if (!role) {
      await safeReply(interaction, 'No role was provided.');
      return;
    }

    const reactionRoles = await getReactionRolesByMessage(targetMessageId);

    if (!reactionRoles || reactionRoles.length < 1) {
      await safeReply(interaction, 'Message does not have any reaction roles.');
      return;
    }

    const channel = await interaction.client.channels.fetch(
      reactionRoles[0].channelId,
    );

    if (!channel || !channel.isTextBased()) {
      await safeReply(interaction, 'Invalid channel.');
      return;
    }

    const message = await channel.messages.fetch(targetMessageId);

    if (message && message.editable) {
      if (reactionRoles.some((rr) => rr.emoji === emoji)) {
        await safeReply(
          interaction,
          'This emoji is already used for a reaction role on this message.',
        );
        return;
      }

      const newReactionRole = await addReactionRole(
        interaction.guildId as string,
        targetMessageId,
        reactionRoles[0].channelId,
        emoji,
        role.id,
      );

      if (!newReactionRole) {
        logWithTime(
          'Something went wrong while creating a reaction role',
          'error',
          scope,
          true,
        );
        await safeReply(
          interaction,
          'Something went wrong while creating the reaction role.',
        );
        return;
      }

      const description = Object.entries([newReactionRole, ...reactionRoles])
        .map(
          ([, reactionRole]) =>
            `${reactionRole.emoji} = <@&${reactionRole.role}>`,
        )
        .join('\n');

      const oldEmbed = message.embeds[0];

      const embed = embedBuilder({
        title: oldEmbed.title ?? '',
        description,
        footer: oldEmbed.footer?.text ?? `Click the emojis to get the roles!`,
      });

      await message.edit({ embeds: [embed] });
      await message.react(newReactionRole.emoji);

      await safeReply(
        interaction,
        `Added reaction role ${emoji} for <@&${role.id}> to the message.`,
        true,
      );
      return;
    } else {
      await safeReply(interaction, 'Message not found or not editable.');
      return;
    }
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder
      .addStringOption(
        stringOption(
          'message_id',
          'The ID of the message to add the reaction role to',
          true,
        ),
      )
      .addStringOption(
        stringOption('emoji', 'The emoji to use for the reaction role', true),
      )
      .addRoleOption(
        roleOption(
          'role',
          'The role to assign when the emoji is reacted to',
          true,
        ),
      );
  }
}
