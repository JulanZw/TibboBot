import {
  Message,
  Interaction,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
  OmitPartialGroupDMChannel,
  PartialMessage,
} from 'discord.js';
import { DiscordHandler } from '@julanzw/ttoolbox-discordjs-framework';

import { handleMessageCreation } from '../handlers/messageCreation.ts';
import { handleInteractionCreation } from '../handlers/interactionCreation.ts';
import { handleReactionAdded } from '../handlers/reactionAdded.ts';
import { handleReactionRemoval } from '../handlers/reactionRemoved.ts';
import { handleMessageDeletion } from '../handlers/messageDeletion.ts';

export class BotDiscordHandler extends DiscordHandler {
  async handleMessageCreation(message: Message<boolean>): Promise<void> {
    await handleMessageCreation(message);
  }

  async handleInteractionCreation(interaction: Interaction): Promise<void> {
    await handleInteractionCreation(interaction);
  }

  async handleReactionAdded(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    await handleReactionAdded(reaction, user);
  }

  async handleReactionRemoval(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void> {
    await handleReactionRemoval(reaction, user);
  }

  async handleMessageDeletion(
    message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
  ): Promise<void> {
    await handleMessageDeletion(message);
  }
}
