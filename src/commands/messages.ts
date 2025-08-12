import { booleanOption, userOption } from '../utils/slashCommandOptions';
import { embedBuilder } from '../utils/embeds';
import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import {
  getAllUsersCharsAndMessages,
  getUserCharsAndMessages,
} from '../database/user';
import { Subcommand } from '../utils/typesAndInterfaces';

const scope = 'messages';

export const messageCommands = commandBuilder(
  'messages',
  'All commands related to messages',
  async () => {},
  false,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'leaderboard',
      {
        name: 'leaderboard',
        description:
          'Show the leaderboard for all characters and messages sent',
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

          const fields = await Promise.all(
            users.slice(0, 10).map(async (row, index) => {
              try {
                const user = await client.users.fetch(row.discordId);

                return {
                  name: `#${index + 1} - ${user.displayName ?? user.username}`,
                  value: `Messages: ${row.msg_count}, Characters: ${row.char_count}`,
                  inline: false,
                };
              } catch (err: any) {
                logWithTime('Error fetching user:' + err, 'error', scope, true);
                return {
                  name: `#${index + 1} - Unknown User`,
                  value: `Messages: ${row.msg_count}, Characters: ${row.char_count}`,
                  inline: false,
                };
              }
            }),
          );

          const leaderboardEmbed = embedBuilder({
            title: 'Leaderboard',
            fields,
          });

          await safeReply(interaction, '', false, [leaderboardEmbed]);
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
);
