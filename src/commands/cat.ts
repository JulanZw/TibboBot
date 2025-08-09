import { embedBuilder } from '../utils/embeds';
import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';

export const catCommand = commandBuilder(
  'cat',
  'Sends a random cat picture.',
  async (interaction) => {
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
      logWithTime('Error fetching cat image:' + err, 'warn', true);
      await safeReply(interaction, "Sorry, I couldn't fetch a cat image.");
    }
  },
  false,
  'user',
);
