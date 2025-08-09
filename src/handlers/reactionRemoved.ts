import {
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
} from 'discord.js';

import { getRoleForReaction } from '../database/reactionRoles';
import { logWithTime } from '../utils/logging';

export async function handleReactionRemoval(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser,
) {
  if (user.bot) return;

  try {
    const { message } = reaction;

    const emoji = reaction.emoji.name!;
    const guildId = message.guild?.id;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId, messageId, emoji);

    if (!record) return;

    const member = await message.guild.members.fetch(user.id);
    await member.roles.remove(record.role);
    logWithTime(
      `Removed role ${record.role} for user ${user.globalName} (${user.id}) in guild ${guildId}`,
      'info',
    );
  } catch (err: any) {
    logWithTime('Failed to add role: ' + err, 'error', true);
  }
}
