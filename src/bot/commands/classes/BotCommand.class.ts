import { ChatInputCommandInteraction } from 'discord.js';

import { hasOptedOut } from '../../utils/managers/optInOutManager.ts';
import { Command } from '../../../core/commands/Command.class.ts';
import { checkCooldown } from '../../utils/managers/cooldownManager.ts';
import { formatDuration } from '../../../core/utils/formatting.ts';

export abstract class BotCommand extends Command {
  protected additionalValidation(
    interaction: ChatInputCommandInteraction,
  ): string | null {
    if (hasOptedOut(interaction.user.id)) {
      return 'You have opted out of data collection.';
    }

    const secondsRemaining = checkCooldown(
      this.name,
      this.cooldown,
      interaction.user.id,
    );

    if (secondsRemaining > 0) {
      return `You need to wait ${formatDuration(secondsRemaining)} before using this command again.`;
    }
    return null;
  }
}
