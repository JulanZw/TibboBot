import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  userOption,
  integerOption,
} from '@julanzw/ttoolbox-discordjs-framework';

import { getPointGiverIdOfGuild } from '../../../database/guild.ts';
import {
  getUserPoints,
  insertUserData,
  updateUserPoints,
} from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { hasOptedOut } from '../../../utils/managers/optInOutManager.ts';
import { logger } from '../../../index.ts';

const scope = 'todayis_add';

export class AddCommand extends BotCommand {
  name = 'add';
  description = 'Give today-is points to someone';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';

  protected async run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    const pointGiverId = await getPointGiverIdOfGuild(interaction.guildId);

    if (!pointGiverId) {
      await safeReply(interaction, 'This server doesnt have a point giver');
      return;
    }

    if (interaction.user.id !== pointGiverId) {
      await safeReply(interaction, `Only <@${pointGiverId}> can give points`);
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if (!amount || !targetUser) {
      await safeReply(
        interaction,
        `You did not provide a target user or points!`,
      );
      return;
    }

    if (amount < 0) {
      logger.error(
        `Error: Could not add '${amount}' points for '${targetUser.username}' (${targetUser.id}) as negative values are not accepted.`,
        scope,
        true,
      );
      await safeReply(
        interaction,
        `Could not add ${amount} points for <@${targetUser.id}> as negative values are not accepted.`,
      );
      return;
    }

    if (hasOptedOut(targetUser.id)) {
      await safeReply(
        interaction,
        'This user has opted out of data collection.',
      );
      return;
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
      logger.info(`${amount} points were given to the bot`, scope);
    } else {
      await safeReply(
        interaction,
        `Added ${amount} points for <@${targetUser.id}>.`,
      );
      logger.info(
        `${amount} points were given to '${targetUser.username}' (${targetUser.id})`,
        scope,
      );
    }
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder
      .addUserOption(userOption('target', 'The user to give points to'))
      .addIntegerOption(
        integerOption('amount', 'The amount of points to give'),
      );
  }
  // Option handling will be handled by the framework or during registration
}
