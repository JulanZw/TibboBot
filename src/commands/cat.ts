import { ChatInputCommandInteraction } from 'discord.js';

import { embedBuilder } from '../utils/discord/embeds.ts';
import { safeReply } from '../utils/discord/editAndReply.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';
import { logWithTime } from '../utils/logging.ts';

const scope = 'cat';

const catCommand = commandBuilder({
  name: 'cat',
  description: 'Sends a random cat picture.',
  execute: async (interaction: ChatInputCommandInteraction) => {
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
  },
  guildOnly: false,
  permissionLevel: 'user',
});

export default catCommand;
