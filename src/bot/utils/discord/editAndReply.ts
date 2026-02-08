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
  MessageFlags,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';

import { logWithTime } from '../logging.ts';

const scope = 'general';

// #region SafeReply

/**
 * Utility function so replies don't fail
 *
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param ephemeral - If it's ephemeral or not
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
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
) {
  const payload: InteractionReplyOptions = {
    ...(content ? { content } : {}),
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
    ...(files ? { files } : {}),
  };

  if (!interaction.replied && !interaction.deferred) {
    try {
      const now = Date.now();
      const threeMinutes = 3 * 60 * 1000;

      if (now - interaction.createdTimestamp > threeMinutes) {
        logWithTime(
          'This interaction is older than 3 minutes.',
          'error',
          scope,
          true,
        );
        return;
      }
      return await interaction.reply(payload);
    } catch {
      logWithTime(
        `Failed to reply to interaction: ${interaction.id}`,
        'error',
        scope,
        true,
      );
    }
  } else {
    try {
      return await interaction.followUp(payload);
    } catch {
      logWithTime(
        `Failed to reply to interaction: ${interaction.id}`,
        'error',
        scope,
        true,
      );
    }
  }
}

// #endregion

// #region SafeEdit

/**
 * Utility function so edits don't fail
 *
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
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
) {
  const editPayload: InteractionEditReplyOptions = {
    ...(content ? { content } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  try {
    const now = Date.now();
    const threeMinutes = 3 * 60 * 1000;

    if (now - interaction.createdTimestamp > threeMinutes) {
      logWithTime(
        'This interaction is older than 3 minutes.',
        'error',
        scope,
        true,
      );
      return;
    }
    return await interaction.editReply(editPayload);
  } catch {
    logWithTime(
      `Failed to edit interaction: ${interaction.id}`,
      'error',
      scope,
      true,
    );
  }
}

// #endregion
