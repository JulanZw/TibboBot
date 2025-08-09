import { Message, OmitPartialGroupDMChannel, PartialMessage } from 'discord.js';

import { logWithTime } from '../utils/logging';
import {
  getReactionRolesByMessage,
  removeReactionRolesByMessageId,
} from '../database/reactionRoles';

export async function handleMessageDeletion(
  message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
) {
  if (!message.guild || !message.id) return;

  const reactionRoles = await getReactionRolesByMessage(message.id);

  if (reactionRoles && reactionRoles.length > 0) {
    logWithTime(
      `Message ${message.id} deleted. Removing ${reactionRoles.length} reaction role(s).`,
      'info',
    );
    await removeReactionRolesByMessageId(message.id);
  }
}
