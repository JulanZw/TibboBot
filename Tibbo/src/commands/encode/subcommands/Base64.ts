import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discord-framework';

import { builderEncodeDecodeCommand } from '../encodeDecodeHelper.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
export class Base64Command extends BotCommand {
  name = 'base64';
  description = 'Encode or decode Base64';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction) {
    const mode = interaction.options.getString('mode', true);
    const text = interaction.options.getString('text', true);

    try {
      let result: string;
      if (mode === 'encode') {
        result = Buffer.from(text, 'utf-8').toString('base64');
      } else {
        result = Buffer.from(text, 'base64').toString('utf-8');
      }

      await safeReply(interaction, `\`\`\`\n${result}\n\`\`\``, true);
    } catch (err: any) {
      await safeReply(interaction, `Error: ${err}`, true);
    }
  }

  customize() {
    return builderEncodeDecodeCommand('base64', 'Encode or decode Base64');
  }
}
