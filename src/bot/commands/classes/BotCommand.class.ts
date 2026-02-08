import { ChatInputCommandInteraction } from 'discord.js';

import { hasOptedOut } from '../../utils/managers/optInOutManager.ts';
import { Command } from '../../../core/commands/Command.class.ts';

export abstract class BotCommand extends Command {
  protected additionalValidation(
    interaction: ChatInputCommandInteraction,
  ): string | null {
    if (hasOptedOut(interaction.user.id)) {
      return 'You have opted out of data collection.';
    }
    return null;
  }
}
