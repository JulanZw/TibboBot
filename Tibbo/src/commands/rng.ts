import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discord-framework';

import { BotCommand } from '../impl/BotCommand.class.ts';

export class RngCommand extends BotCommand {
  name = 'rng';
  description =
    'Responds with a random number. If a range is provided, responds with a number within that range';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const min = interaction.options.getInteger('min', false);
    const max = interaction.options.getInteger('max', false);

    if (
      (min && max && min > max) ||
      (min && min > Number.MAX_SAFE_INTEGER) ||
      (max && max < Number.MIN_SAFE_INTEGER)
    ) {
      await safeReply(
        interaction,
        'Invalid range. Please provide a valid min and max.',
        true,
      );
      return;
    }

    const randomNum =
      Math.floor(
        Math.random() *
          ((max ?? Number.MAX_SAFE_INTEGER) -
            (min ?? Number.MIN_SAFE_INTEGER) +
            1),
      ) + (min ?? Number.MIN_SAFE_INTEGER);
    await safeReply(interaction, `${randomNum}`);
  }
}
