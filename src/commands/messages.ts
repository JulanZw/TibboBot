import { booleanOption, userOption } from '../utils/slashCommandOptions.ts';
import { embedBuilder } from '../utils/embeds.ts';
import { commandBuilder, safeReply } from '../utils/general.ts';
import { logWithTime } from '../utils/logging.ts';
import {
  getAllUsersCharsAndMessages,
  getUserCharsAndMessages,
} from '../database/user.ts';
import { Subcommand } from '../utils/typesAndInterfaces.ts';
import { TIMES_MILISECONDS, STANDARD_COLOR } from '../utils/globals.ts';
import { generateLeaderboard } from '../utils/generating.ts';
import { hasOptedOut } from '../utils/optInOut.ts';

const scope = 'messages';

export const messageCommands = commandBuilder({
  name: 'messages',
  description: 'All commands related to messages',
  subcommands: new Map<string, Subcommand>([
    [
      'leaderboard',
      {
        name: 'leaderboard',
        description:
          'Show the leaderboard for all characters and messages sent',
        cooldown: TIMES_MILISECONDS.MINUTE,
        async execute(interaction, client) {
          const guildOnlyFilter = interaction.options.getBoolean('guild_only');

          let users;

          if (guildOnlyFilter) {
            if (!interaction.guild) {
              return await safeReply(
                interaction,
                `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
              );
            }

            const usersIds = (await interaction.guild.members.fetch()).map(
              (m) => m.id,
            );

            users = await getAllUsersCharsAndMessages(usersIds);
          } else {
            users = await getAllUsersCharsAndMessages();
          }

          if (!users || users.length === 0) {
            return await safeReply(
              interaction,
              'No users for the leaderboard.',
            );
          }

          const completeUsers: {
            username: string;
            number1: bigint;
            number2: bigint;
            avatar: string | null;
          }[] = await Promise.all(
            users.slice(0, 10).map(async (row, index) => {
              try {
                const user = await client.users.fetch(row.discordId);

                return {
                  username: `${index + 1}. ${user.displayName ?? user.username}`,
                  number1: BigInt(row.msg_count),
                  number2: row.char_count,
                  avatar: user.displayAvatarURL({ extension: 'png' }),
                };
              } catch (err: any) {
                logWithTime('Error fetching user:' + err, 'error', scope, true);
                return {
                  username: `Unknown User`,
                  number1: BigInt(row.msg_count),
                  number2: row.char_count,
                  avatar: null,
                };
              }
            }),
          );

          const image = await generateLeaderboard(completeUsers, scope);

          const leaderboardEmbed = embedBuilder({
            title: 'Leaderboard',
            description: 'Top 10 users ranked by messages and characters sent',
            color: STANDARD_COLOR,
            customize: (embed) =>
              embed.setImage('attachment://leaderboard.png'),
          });

          await safeReply(
            interaction,
            '',
            false,
            [leaderboardEmbed],
            undefined,
            [image],
          );
        },
        customize: (builder) => {
          return builder.addBooleanOption(
            booleanOption(
              'guild_only',
              'show the leaderboard with only people from this server',
              false,
            ),
          );
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
    [
      'user',
      {
        name: 'user',
        description: 'Show the amount of messages and characters someone sent',
        async execute(interaction) {
          const targetUser = interaction.options.getUser('target');

          if (!targetUser) {
            return await safeReply(interaction, 'No target user was provided.');
          }

          if (hasOptedOut(targetUser.id)) {
            return await safeReply(
              interaction,
              'This user has opted out of data collection.',
            );
          }

          const user = await getUserCharsAndMessages(targetUser.id);
          if (user) {
            await safeReply(
              interaction,
              `User ${targetUser.username} has sent ${user.char_count} charachter(s) in ${user.msg_count} message(s).`,
            );
          } else {
            await safeReply(
              interaction,
              `User ${targetUser.username} has not sent any messages yet.`,
            );
          }
        },
        customize: (builder) => {
          return builder.addUserOption(
            userOption('target', 'The user to check'),
          );
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
  ]),
});

export default messageCommands;
