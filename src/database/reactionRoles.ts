import { prisma } from '../utils/globals';

export async function addReactionRole(
  guildId: string,
  messageId: string,
  channelId: string,
  emoji: string,
  roleId: string,
) {
  return await prisma.reactionRoles.create({
    data: {
      guildId,
      messageId,
      channelId,
      emoji,
      role: roleId,
    },
  });
}

export async function getRoleForReaction(
  guildId: string,
  messageId: string,
  emoji: string,
) {
  return await prisma.reactionRoles.findUnique({
    where: {
      guildId_messageId_emoji: {
        guildId,
        messageId,
        emoji,
      },
    },
  });
}

export async function getReactionRolesByMessage(messageId: string) {
  return await prisma.reactionRoles.findMany({
    where: { messageId },
  });
}

export async function removeReactionRolesByMessageId(messageId: string) {
  return await prisma.reactionRoles.deleteMany({
    where: { messageId },
  });
}

export async function deleteReactionRolesByMessage(messageId: string) {
  return await prisma.reactionRoles.deleteMany({
    where: {
      messageId,
    },
  });
}

export async function deleteReactionRole(
  guildId: string,
  messageId: string,
  emoji: string,
) {
  return await prisma.reactionRoles.delete({
    where: {
      guildId_messageId_emoji: {
        guildId,
        messageId,
        emoji,
      },
    },
  });
}
