import {
  booleanOption,
  userOption,
} from '../../utils/discord/slashCommandOptions.ts';
import { embedBuilder } from '../../utils/discord/embeds.ts';
import { safeReply } from '../../utils/discord/editAndReply.ts';
import { commandBuilder } from '../../utils/discord/commandBuilder.ts';
import {
  getAllUsersCharsAndMessages,
  getUserCharsAndMessages,
} from '../../database/user.ts';
import { TIMES_MILISECONDS, STANDARD_COLOR } from '../../utils/globals.ts';
import {
  generateLeaderboard,
  prepareLeaderboardData,
} from '../../utils/generating.ts';
import { hasOptedOut } from '../../utils/managers/optInOutManager.ts';
import { Subcommand } from '../../types/commands.ts';

const scope = 'messages';

const messageCommands = commandBuilder({
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
          await interaction.deferReply();
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

          const completeUsers = await prepareLeaderboardData({
            users,
            client,
            number1Key: 'msg_count',
            number2Key: 'char_count',
            scope,
          });

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
