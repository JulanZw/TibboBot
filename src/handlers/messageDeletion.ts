import { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';

import {
  getReactionRolesByMessage,
  removeReactionRolesByMessageId,
} from '../database/reactionRoles.ts';
import { logger } from '../index.ts';

const scope = 'handler_MESSAGEDELETION';

export async function handleMessageDeletion(
  message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
) {
  if (!message.guild || !message.id) return;

  const reactionRoles = await getReactionRolesByMessage(message.id);

  if (reactionRoles && reactionRoles.length > 0) {
    logger.info(
      `Message ${message.id} deleted. Removing ${reactionRoles.length} reaction role(s).`,
      scope,
    );
    await removeReactionRolesByMessageId(message.id);
  }
}
