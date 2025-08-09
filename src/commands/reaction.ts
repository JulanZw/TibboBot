import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import {
  stringOption,
  roleOption,
  channelOption,
} from '../utils/slashCommandOptions';
import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { pendingReactionRoleSetups } from '../utils/constants';
import { embedBuilder } from '../utils/embeds';
import {
  getReactionRolesByMessage,
  addReactionRole,
} from '../database/reactionRoles';
import { Subcommand } from '../utils/typesAndInterfaces';

export const reactionCommands = commandBuilder(
  'reaction',
  'All commands for creating and updating a reaction message',
  async () => {},
  false,
  'admin',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'add',
      {
        name: 'add',
        description:
          'Adds a reaction role to a message after creating a reaction role message.',
        async execute(
          interaction: ChatInputCommandInteraction,
          client: Client,
        ) {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const targetMessageId = interaction.options.getString('message_id');
          const emoji = interaction.options.getString('emoji');
          const role = interaction.options.getRole('role');

          if (!targetMessageId) {
            return await safeReply(
              interaction,
              'No target message ID was provided.',
            );
          } else if (!emoji) {
            return await safeReply(interaction, 'No emoji was provided.');
          } else if (!role) {
            return await safeReply(interaction, 'No role was provided.');
          }

          const reactionRoles =
            await getReactionRolesByMessage(targetMessageId);

          if (!reactionRoles || reactionRoles.length < 1) {
            return await safeReply(
              interaction,
              'Message does not have any reaction roles.',
            );
          }

          const channel = await client.channels.fetch(
            reactionRoles[0].channelId,
          );

          if (!channel || !channel.isTextBased())
            return await safeReply(interaction, 'Invalid channel.');

          const message = await channel.messages.fetch(targetMessageId);

          if (message && message.editable) {
            if (reactionRoles.some((rr) => rr.emoji === emoji)) {
              return await safeReply(
                interaction,
                'This emoji is already used for a reaction role on this message.',
              );
            }

            const newReactionRole = await addReactionRole(
              interaction.guildId,
              targetMessageId,
              reactionRoles[0].channelId,
              emoji,
              role.id,
            );

            if (!newReactionRole) {
              logWithTime(
                'Something went wrong while creating a reaction role',
                'error',
                true,
              );
              return await safeReply(
                interaction,
                'Something went wrong while creating the reaction role.',
              );
            }

            const description = Object.entries([
              newReactionRole,
              ...reactionRoles,
            ])
              .map(
                ([, reactionRole]) =>
                  `${reactionRole.emoji} = <@&${reactionRole.role}>`,
              )
              .join('\n');

            const oldEmbed = message.embeds[0];

            const embed = embedBuilder({
              title: oldEmbed.title ?? '',
              description,
              footer:
                oldEmbed.footer?.text ?? `Click the emojis to get the roles!`,
            });

            await message.edit({ embeds: [embed] });
            await message.react(newReactionRole.emoji);

            return await safeReply(
              interaction,
              `Added reaction role ${emoji} for <@&${role.id}> to the message.`,
              true,
            );
          } else {
            return await safeReply(
              interaction,
              'Message not found or not editable.',
            );
          }
        },
        customize: (builder: SlashCommandSubcommandBuilder) => {
          return builder
            .addStringOption(
              stringOption(
                'message_id',
                'The ID of the message to add the reaction role to',
                true,
              ),
            )
            .addStringOption(
              stringOption(
                'emoji',
                'The emoji to use for the reaction role',
                true,
              ),
            )
            .addRoleOption(
              roleOption(
                'role',
                'The role to assign when the emoji is reacted to',
                true,
              ),
            );
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
    [
      'create',
      {
        name: 'create',
        description: 'Create a reaction role message',
        async execute(interaction: ChatInputCommandInteraction) {
          const userId = interaction.user.id;

          const targetChannel = interaction.options.getChannel('target');
          const title = interaction.options.getString('title');

          if (!targetChannel) {
            return await safeReply(
              interaction,
              'No target channel was provided.',
            );
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
          logWithTime('Reaction message proces started', 'info');
        },
        customize: (builder: SlashCommandSubcommandBuilder) => {
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
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
);
