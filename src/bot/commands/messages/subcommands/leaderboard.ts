import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { getAllUsersCharsAndMessages } from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { PermissionLevel } from '../../../../core/types/permission.ts';
import { booleanOption } from '../../../../core/utils/slashCommandOptions.ts';
import { safeReply } from '../../../../core/utils/editAndReply.ts';
import { embedBuilder } from '../../../../core/utils/embeds.ts';
import { TIMES_MILISECONDS } from '../../../../core/utils/miliseconds.ts';
import {
  prepareLeaderboardData,
  generateLeaderboard,
} from '../../../utils/generating.ts';
import { STANDARD_COLOR } from '../../../utils/globals.ts';

const scope = 'messages';

export class LeaderboardCommand extends BotCommand {
  name = 'leaderboard';
  description = 'Show the leaderboard for all characters and messages sent';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';

  cooldown = TIMES_MILISECONDS.MINUTE;

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    await interaction.deferReply();
    const guildOnlyFilter = interaction.options.getBoolean('guild_only');

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

      users = await getAllUsersCharsAndMessages(usersIds);
    } else {
      users = await getAllUsersCharsAndMessages();
    }

    if (!users || users.length === 0) {
      await safeReply(interaction, 'No users for the leaderboard.');
      return;
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
      customize: (embed) => embed.setImage('attachment://leaderboard.png'),
    });

    await safeReply(interaction, '', false, [leaderboardEmbed], undefined, [
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
