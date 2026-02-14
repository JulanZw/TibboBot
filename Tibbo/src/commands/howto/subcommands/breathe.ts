import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discord-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';

export class BreatheCommand extends BotCommand {
  guildOnly = false;
  permissionLevel = 'user' as const;
  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    await safeReply(interaction, 'inhale, exhale ez😎');
  }
  name = 'breathe';
  description = 'How does one breathe';
}
