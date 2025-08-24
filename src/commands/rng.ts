import { ChatInputCommandInteraction } from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { integerOption } from '../utils/slashCommandOptions';

export const rngCommand = commandBuilder({
  name: 'rng',
  description:
    'Responds with a random number. If a range is provided, responds with a number within that range',
  execute: async (interaction: ChatInputCommandInteraction) => {
    const min = interaction.options.getInteger('min', false);
    const max = interaction.options.getInteger('max', false);

    if (
      (min && max && min > max) ||
      (min && min > Number.MAX_SAFE_INTEGER) ||
      (max && max < Number.MIN_SAFE_INTEGER)
    ) {
      return safeReply(
        interaction,
        'Invalid range. Please provide a valid min and max.',
        true,
      );
    }

    const randomNum =
      Math.floor(
        Math.random() *
          ((max ?? Number.MAX_SAFE_INTEGER) -
            (min ?? Number.MIN_SAFE_INTEGER) +
            1),
      ) + (min ?? Number.MIN_SAFE_INTEGER);
    await safeReply(interaction, `${randomNum}`);
  },
  guildOnly: false,
  permissionLevel: 'user',
  customize: (builder) => {
    builder.addIntegerOption(
      integerOption('min', 'The minimum value of the number', false),
    );
    builder.addIntegerOption(
      integerOption('max', 'The maximum value of the number', false),
    );
    return builder;
  },
});
