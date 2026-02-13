import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { safeReply } from '../../../../core/utils/editAndReply.ts';
import { logWithTime } from '../../../../core/utils/logging.ts';
import { getPointGiverIdOfGuild } from '../../../database/guild.ts';
import {
  getUserPoints,
  insertUserData,
  updateUserPoints,
} from '../../../database/user.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { PermissionLevel } from '../../../../core/types/permission.ts';
import { hasOptedOut } from '../../../utils/managers/optInOutManager.ts';
import {
  userOption,
  integerOption,
} from '../../../../core/utils/slashCommandOptions.ts';

const scope = 'todayis_deduct';

export class DeductCommand extends BotCommand {
  name = 'deduct';
  description = 'Deduct today-is points from someone';
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
      await safeReply(interaction, `Only <@${pointGiverId}> can deduct points`);
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if (!targetUser) {
      await safeReply(interaction, `You did not provide a target user!`);
      return;
    }

    if (!amount) {
      await safeReply(interaction, `You did not provide points!`);
      return;
    }

    if (amount < 0) {
      logWithTime(
        `Error: Could not deduct '${amount}' points for '${targetUser.username}' (${targetUser.id}) as negative values are not accepted.`,
        'error',
        scope,
        true,
      );
      await safeReply(
        interaction,
        `Could not deduct ${amount} points for <@${targetUser.id}> as negative values are not accepted.`,
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
      await insertUserData(targetUser.id, BigInt(0), 0, BigInt(0));
      await safeReply(
        interaction,
        'Cannot deduct points from a user that has no points.',
      );
      return;
    } else if (user.points - BigInt(amount) < 0) {
      await updateUserPoints(targetUser.id, BigInt(0));
    } else {
      await updateUserPoints(targetUser.id, user.points - BigInt(amount));
    }

    if (targetUser.id === client.user?.id) {
      await safeReply(
        interaction,
        `Oh... You took away ${amount} points from me...`,
      );
      logWithTime(`${amount} points were deducted from the bot`, 'info', scope);
    } else {
      await safeReply(
        interaction,
        `Deducted ${amount} points form <@${targetUser.id}>.`,
      );
      logWithTime(
        `${amount} points were deducted from '${targetUser.username}' (${targetUser.id})`,
        'info',
        scope,
      );
    }
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder
      .addUserOption(userOption('target', 'The user to deduct points from'))
      .addIntegerOption(
        integerOption('amount', 'The amount of points to deduct'),
      );
  }
}
