import { ChatInputCommandInteraction } from 'discord.js';
import { PermissionLevel } from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { sendUserStats } from '../helper.ts';

export class UserStatsCommand extends BotCommand {
  name = 'user';
  description = 'Shows your stats.';
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    await sendUserStats(interaction);
  }
}
