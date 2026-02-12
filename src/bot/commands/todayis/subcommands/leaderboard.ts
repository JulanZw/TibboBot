import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { safeReply } from '../../../../core/utils/editAndReply.ts';
import { embedBuilder } from '../../../../core/utils/embeds.ts';
import { TIMES_MILISECONDS } from '../../../../core/utils/miliseconds.ts';
import { getAllUsersDataTodayIs } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { PermissionLevel } from '../../../types/permission.ts';
import {
  prepareLeaderboardData,
  generateLeaderboard,
} from '../../../utils/generating.ts';
import { booleanOption } from '../../../../core/utils/slashCommandOptions.ts';
import { STANDARD_COLOR } from '../../../utils/globals.ts';

const scope = 'todayis_leaderboard';

export class LeaderboardCommand extends BotCommand {
  name = 'leaderboard';
  description = 'Show the leaderboard for the today-is points';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';
  cooldown = TIMES_MILISECONDS.MINUTE;

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    await interaction.deferReply();

    const guildOnlyFilter = interaction.options.getBoolean('guild_only', false);

    let users;

    if (guildOnlyFilter) {
      if (!interaction.guild) {
        await safeReply(
          interaction,
          `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
        );
        return;
      }

      const usersIds = (await interaction.guild.members.fetch()).map(
        (m) => m.id,
      );

      users = await getAllUsersDataTodayIs(usersIds);
    } else {
      users = await getAllUsersDataTodayIs();
    }

    if (!users || users.length === 0) {
      await safeReply(
        interaction,
        'No user data available for the leaderboard.',
      );
      return;
    }

    const completeUsers = await prepareLeaderboardData({
      users,
      client,
      number1Key: 'points',
      scope,
    });

    const image = await generateLeaderboard(
      completeUsers,
      scope,
      'Today Is Leaderboard',
    );

    const pointboardEmbed = embedBuilder({
      title: 'Today Is Leaderboard',
      description: 'Top 10 users ranked by today-is points',
      color: STANDARD_COLOR,
      customize: (embed) => embed.setImage('attachment://leaderboard.png'),
    });

    await safeReply(interaction, '', false, [pointboardEmbed], undefined, [
      image,
    ]);
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder.addBooleanOption(
      booleanOption(
        'guild_only',
        'show the leaderboard with only people from this server',
        false,
      ),
    );
  }
}
