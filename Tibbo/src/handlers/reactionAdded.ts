import {
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from 'discord.js';

import { getRoleForReaction } from '../database/reactionRoles.ts';
import { logger } from '../index.ts';

const scope = 'handler_REACTIONADDING';

export async function handleReactionAdded(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();

    const { message } = reaction;
    if (message.partial) await message.fetch();

    const emoji = reaction.emoji.name!;
    const guildId = message.guildId;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId, messageId, emoji);

    if (!record) return;

    const member = await message.guild!.members.fetch(user.id);
    await member.roles.add(record.role);
    logger.info(
      `Added role ${record.role} for user ${user.globalName} (${user.id}) in guild ${guildId}`,
      scope,
    );
  } catch (err: any) {
    logger.error('Failed to add role: ' + err, scope, true);
  }
}
