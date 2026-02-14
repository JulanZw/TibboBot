import { ChatInputCommandInteraction } from 'discord.js';
import {
  TIMES_MILISECONDS,
  embedBuilder,
  safeReply,
  logWithTime,
} from '@julanzw/ttoolbox-discord-framework';

import { incrementStatistic } from '../database/stats.ts';
import { BotCommand } from '../impl/BotCommand.class.ts';

const scope = 'cat';

export class CatCommand extends BotCommand {
  name = 'cat';
  description = 'Sends a random cat picture.';
  guildOnly = false;
  permissionLevel = 'user' as const;
  cooldown = TIMES_MILISECONDS.SECOND;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    await incrementStatistic('catsRequested', interaction.user.id, 1);
    try {
      const response = await fetch(
        'https://api.thecatapi.com/v1/images/search',
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: { url: string }[] = await response.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No cat image found');
      }
      const imageUrl = data[0].url;

      const catEmbed = embedBuilder({
        title: "Here's a cat for you!",
        customize: (embed) => embed.setImage(imageUrl),
      });

      await safeReply(interaction, '', false, [catEmbed]);
    } catch (err: any) {
      logWithTime('Error fetching cat image:' + err, 'warn', scope, true);
      await safeReply(interaction, "Sorry, I couldn't fetch a cat image.");
    }
  }
}
