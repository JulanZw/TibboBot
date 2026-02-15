import Stream from 'stream';

import {
  ActionRowBuilder,
  APIAttachment,
  Attachment,
  AttachmentBuilder,
  AttachmentPayload,
  BufferResolvable,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  JSONEncodable,
  Message,
  MessageFlags,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';

import { InteractionError } from '../classes/InteractionError.class.js';

/**
 * Safely replies to an interaction, handling deferred/replied states.
 *
 * @param interaction - The interaction to reply to
 * @param content - The message content
 * @param ephemeral - Whether the reply should be ephemeral
 * @param embeds - Optional embeds to include
 * @param components - Optional components to include
 * @param files - Optional files to attach
 * @returns The message that was sent
 * @throws {InteractionError} If the interaction is too old or fails
 *
 * @example
 * ```typescript
 * try {
 *   await safeReply(interaction, 'Hello!', true);
 * } catch (err) {
 *   if (err instanceof InteractionError && err.reason === 'expired') {
 *     this.logger?.warn('Interaction expired', 'command');
 *   }
 * }
 * ```
 */
export async function safeReply(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  content: string,
  ephemeral: boolean = false,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[],
  files?: (
    | BufferResolvable
    | Stream
    | JSONEncodable<APIAttachment>
    | Attachment
    | AttachmentBuilder
    | AttachmentPayload
  )[],
): Promise<Message> {
  // Check if interaction is too old
  const now = Date.now();
  const threeMinutes = 3 * 60 * 1000;

  if (now - interaction.createdTimestamp > threeMinutes) {
    throw new InteractionError(
      'Interaction is older than 3 minutes',
      interaction.id,
      'expired',
    );
  }

  const payload: InteractionReplyOptions = {
    ...(content ? { content } : {}),
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
    ...(files ? { files } : {}),
  };

  try {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(payload);
      return await interaction.fetchReply();
    } else {
      return await interaction.followUp(payload);
    }
  } catch (err: any) {
    throw new InteractionError(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `Failed to reply to interaction: ${err.message}`,
      interaction.id,
      'failed',
    );
  }
}

/**
 * Safely edits an interaction reply.
 *
 * @param interaction - The interaction to edit
 * @param content - The new message content
 * @param embeds - Optional embeds to include
 * @param components - Optional components to include
 * @returns The edited message
 * @throws {InteractionError} If the interaction is too old or fails
 */
export async function safeEdit(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  content: string,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[],
): Promise<Message> {
  // Check if interaction is too old
  const now = Date.now();
  const threeMinutes = 3 * 60 * 1000;

  if (now - interaction.createdTimestamp > threeMinutes) {
    throw new InteractionError(
      'Interaction is older than 3 minutes',
      interaction.id,
      'expired',
    );
  }

  const editPayload: InteractionEditReplyOptions = {
    ...(content ? { content } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  try {
    return await interaction.editReply(editPayload);
  } catch (err: any) {
    throw new InteractionError(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `Failed to edit interaction: ${err.message}`,
      interaction.id,
      'failed',
    );
  }
}
