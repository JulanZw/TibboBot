import {
  booleanOption,
  userOption,
  integerOption,
} from '../utils/slashCommandOptions';
import { embedBuilder } from '../utils/embeds';
import { commandBuilder, safeReply } from '../utils/general';
import { getPointGiverIdOfGuild, getGuild } from '../database/guild';
import {
  getAllUsersDataTodayIs,
  getUserPoints,
  insertUserData,
  updateUserPoints,
  setPointGiverOfGuild,
} from '../database/user';
import { Subcommand } from '../utils/typesAndInterfaces';
import { logWithTime } from '../utils/logging';

const scope = 'todayis';

export const todayIsCommands = commandBuilder(
  'today-is',
  'All commands for today-is',
  async () => {},
  true,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'leaderboard',
      {
        name: 'leaderboard',
        description: 'Show the leaderboard for the today-is points',
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

            users = await getAllUsersDataTodayIs(usersIds);
          } else {
            users = await getAllUsersDataTodayIs();
          }

          if (!users || users.length === 0) {
            return await safeReply(
              interaction,
              'No user data available for the leaderboard.',
            );
          }

          const fields = await Promise.all(
            users.slice(0, 10).map(async (row, index) => {
              try {
                const user = await client.users.fetch(row.discordId);

                return {
                  name: `#${index + 1}: ${user.displayName ?? user.username}`,
                  value: `${row.points} points`,
                  inline: false,
                };
              } catch (err: any) {
                logWithTime(
                  'Error fetching user: ' + err,
                  'error',
                  scope,
                  true,
                );
                return {
                  name: `#${index + 1}: Unknown User`,
                  value: `${row.points} points`,
                  inline: false,
                };
              }
            }),
          );

          const pointboardEmbed = embedBuilder({
            title: 'Today Is Leaderboard',
            fields,
          });

          await safeReply(interaction, '', false, [pointboardEmbed]);
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
      'add',
      {
        name: 'add',
        description: 'Give today-is points to someone',
        async execute(interaction, client) {
          const pointGiverId = await getPointGiverIdOfGuild(
            interaction.guildId,
          );

          if (!pointGiverId) {
            return await safeReply(
              interaction,
              'This server doesnt have a point giver',
            );
          }

          if (interaction.user.id !== pointGiverId) {
            return await safeReply(
              interaction,
              `Only <@${pointGiverId}> can give points`,
            );
          }

          const targetUser = interaction.options.getUser('target');
          const amount = interaction.options.getInteger('amount');

          if (!amount || !targetUser) {
            return await safeReply(
              interaction,
              `You did not provide a target user or points!`,
            );
          }

          if (amount < 0) {
            logWithTime(
              `Error: Could not add '${amount}' points for '${targetUser.username}' (${targetUser.id}) as negative values are not accepted.`,
              'error',
              scope,
              true,
            );
            return await safeReply(
              interaction,
              `Could not add ${amount} points for <@${targetUser.id}> as negative values are not accepted.`,
            );
          }

          const user = await getUserPoints(targetUser.id);
          if (!user) {
            await insertUserData(targetUser.id, BigInt(0), 0, BigInt(amount));
          } else {
            await updateUserPoints(targetUser.id, BigInt(amount) + user.points);
          }
          if (targetUser.id === client.user?.id) {
            await safeReply(
              interaction,
              `Thank you <@${interaction.user.id}> for the ${amount} points`,
            );
            logWithTime(
              `${amount} points were given to the bot`,
              'info',
              scope,
            );
          } else {
            await safeReply(
              interaction,
              `Added ${amount} points for <@${targetUser.id}>.`,
            );
            logWithTime(
              `${amount} points were given to '${targetUser.username}' (${targetUser.id})`,
              'info',
              scope,
            );
          }
        },
        customize: (builder) => {
          return builder
            .addUserOption(userOption('target', 'The user to give points to'))
            .addIntegerOption(
              integerOption('amount', 'The amount of points to give'),
            );
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
    [
      'pointgiver',
      {
        name: 'pointgiver',
        description: 'Set the servers pointgiver (admin only)',
        async execute(interaction) {
          const guild = await getGuild(interaction.guildId);

          if (!guild) {
            return await safeReply(
              interaction,
              `Guild is not in the database. You should never see this message, contact the bot owner please.`,
            );
          }

          const targetUser = interaction.options.getUser('target');

          if (!targetUser) {
            return await safeReply(interaction, 'No target user was provided.');
          }

          await setPointGiverOfGuild(
            interaction.guildId as string,
            targetUser.id,
          );
          await safeReply(
            interaction,
            guild.todayIsChannelId
              ? `set <@${targetUser.id}> as the server's point giver`
              : `set <@${targetUser.id}> as the server's point giver. Dont forget to also set a todayIs channel!`,
          );
          logWithTime(
            `Set ${targetUser.id} as pointgiver for ${guild.guildId}`,
            'info',
            scope,
          );
        },
        customize: (builder) => {
          return builder.addUserOption(
            userOption('target', 'The user put as point giver'),
          );
        },
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
);
