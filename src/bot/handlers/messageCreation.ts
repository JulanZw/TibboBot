import { Message, MessageFlags, TextChannel } from 'discord.js';
import { evaluate } from 'mathjs';

import {
  humanParticipatedToday,
  pendingReactionRoleSetups,
  todayWinners,
} from '../utils/globals.ts';
import { preprocessNumerics } from '../utils/preprocessors.ts';
import { client } from '../index.ts';
import {
  checkAndUpdateCount,
  ensureGuildExistance,
  getLastCountUserAndHighestNumber,
  resetCount,
  setLastCountUser,
  updateDumbScore,
} from '../database/guild.ts';
import { addReactionRole } from '../database/reactionRoles.ts';
import { updateCountsForUser } from '../database/user.ts';
import { looksLikeMathExpression } from '../utils/math.ts';
import { incrementStatistic } from '../database/stats.ts';
import { embedBuilder } from '../../core/utils/embeds.ts';
import { formatDateToString } from '../../core/utils/formatting.ts';
import { logWithTime } from '../../core/utils/logging.ts';

const scope = 'handler_MESSAGECREATION';

export async function handleMessageCreation(message: Message) {
  if (message.author.bot) return;
  await updateCountsForUser(message.author, message.content);
  await incrementStatistic(
    'charsSentThisYear',
    message.author.id,
    message.content.length,
  );
  await incrementStatistic('messagesSentThisYear', message.author.id, 1);
  if (message.guildId) {
    const guild = await ensureGuildExistance(message.guildId);

    if (guild.countChannelId && guild.countChannelId === message.channelId) {
      const content = message.content.trim();
      if (looksLikeMathExpression(content)) {
        try {
          const result: unknown = evaluate(preprocessNumerics(content));

          if (typeof result === 'number' && isFinite(result)) {
            const number: number = Math.round(result);
            const success = await checkAndUpdateCount(guild.guildId, number);
            const lastCountUser = await getLastCountUserAndHighestNumber(
              guild.guildId,
            );

            if (!success) {
              await message.react('❌');
              await message.reply(
                `<@${message.author.id}> entered a wrong number! Next number is 1...`,
              );
              await resetCount(guild.guildId);
              return;
            } else if (
              lastCountUser?.lastCountUser &&
              lastCountUser.lastCountUser === message.author.id &&
              process.env.ENV !== 'dev'
            ) {
              await message.react('❌');
              await message.reply(
                `Only count on yourself, not with yourself... Next number is 1...`,
              );
              await resetCount(guild.guildId);
              return;
            } else if (
              lastCountUser?.highestNumber &&
              result > lastCountUser?.highestNumber
            ) {
              await message.react('☑️');
            } else {
              await message.react('✅');
            }
            await setLastCountUser(guild.guildId, message.author.id);
          }
        } catch (err: any) {
          logWithTime(
            `Invalid math expression: "${content}" — ${err}`,
            'warn',
            scope,
          );
        }
      }
    } else if (
      guild.todayIsChannelId === message.channelId &&
      message.content.toLowerCase().startsWith('today is')
    ) {
      await incrementStatistic(
        'todayIsParticipationDays',
        message.author.id,
        1,
      );
      const now = new Date();
      const today = formatDateToString(now);
      const expected = `today is ${today}`;
      // the expected string still to lowercase for the month names
      if (!message.content.toLowerCase().includes(expected.toLowerCase())) {
        return;
      }
      if (!todayWinners[guild.guildId]) {
        todayWinners[guild.guildId] = 'human';
        humanParticipatedToday.push(guild.guildId);
        await updateDumbScore(guild.guildId, true);
        await incrementStatistic('todayIsWins', message.author.id, 1);
      }
    }

    const session = pendingReactionRoleSetups.get(message.author.id);

    if (session && message.channelId === session.channelId) {
      if (message.content.toLowerCase() === 'done') {
        session.messageIds.push(message.id);
        const { emojiRoleMap, interaction, channelId, messageIds } = session;
        const channel = await client.channels.fetch(channelId);
        if (!channel?.isTextBased()) return;

        if (Object.keys(emojiRoleMap).length === 0) {
          await message.reply('No emoji-role pairs were added.');
          pendingReactionRoleSetups.delete(message.author.id);
          return;
        }

        const description = Object.entries(emojiRoleMap)
          .map(([emoji, roleId]) => `${emoji} = <@&${roleId}>`)
          .join('\n');

        const embed = embedBuilder({
          title: session.title,
          description: description,
          footer: `Click the emojis to get the roles!`,
        });

        const sentMessage = await (channel as TextChannel).send({
          embeds: [embed],
        });

        for (const emoji of Object.keys(emojiRoleMap)) {
          const newReactionRole = await addReactionRole(
            guild.guildId,
            sentMessage.id,
            session.targetChannelId,
            emoji,
            emojiRoleMap[emoji],
          );
          if (newReactionRole) {
            await sentMessage.react(newReactionRole.emoji);
          } else {
            logWithTime(
              `Something went wrong while creating a reaction message`,
              'error',
              scope,
              true,
            );

            return await interaction.followUp({
              content: 'Something went wrong while creating the message.',
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        for (const id of messageIds || []) {
          try {
            const msgToDelete = await channel.messages.fetch(id);
            if (msgToDelete.deletable) await msgToDelete.delete();
          } catch (err: any) {
            logWithTime(
              `Failed to delete message ${id}: ` + err,
              'warn',
              scope,
            );
          }
        }

        await interaction.followUp({
          content: 'Reaction role message created!',
          flags: MessageFlags.Ephemeral,
        });

        pendingReactionRoleSetups.delete(message.author.id);
        return;
      } else {
        session.messageIds.push(message.id);
        const match = message.content.match(
          /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+<@&(\d+)>$/u,
        );
        if (!match) {
          await message.reply('Invalid format. Please use `🟥 @RoleMention`.');
          return;
        }

        const [, emoji, roleId] = match;
        session.emojiRoleMap[emoji] = roleId;

        const reply = await message.reply(
          `Added mapping: ${emoji} -> <@&${roleId}>`,
        );

        session.messageIds.push(reply.id);
      }
    }
  }
}
