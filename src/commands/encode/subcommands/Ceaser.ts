import { ChatInputCommandInteraction } from 'discord.js';
import {
  PermissionLevel,
  safeReply,
} from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { builderEncodeDecodeCommand } from '../encodeDecodeHelper.ts';

export class CeaserCommand extends BotCommand {
  name = 'ceaser';
  description = 'Encode or decode using Caesar cipher';
  guildOnly = false;
  permissionLevel: PermissionLevel;
  protected async run(interaction: ChatInputCommandInteraction) {
    const mode = interaction.options.getString('mode', true);
    const text = interaction.options.getString('text', true);
    const shift = interaction.options.getInteger('shift', true);

    try {
      let result: string;
      if (mode === 'encode') {
        result = caesarEncode(text, shift);
      } else {
        result = caesarDecode(text, shift);
      }

      await safeReply(interaction, `\`\`\`\n${result}\n\`\`\``, true);
    } catch (err: any) {
      await safeReply(interaction, `Error: ${err}`, true);
    }
  }

  customize() {
    return builderEncodeDecodeCommand(
      'caesar',
      'Encode or decode using Caesar cipher',
    ).addIntegerOption((option) =>
      option
        .setName('shift')
        .setDescription('Shift amount (1-25)')
        .setRequired(true),
    );
  }
}

function caesarEncode(text: string, shift: number) {
  return text
    .split('')
    .map((char) => {
      if (/[a-z]/.test(char)) {
        return String.fromCharCode(
          ((char.charCodeAt(0) - 97 + shift) % 26) + 97,
        );
      }
      if (/[A-Z]/.test(char)) {
        return String.fromCharCode(
          ((char.charCodeAt(0) - 65 + shift) % 26) + 65,
        );
      }
      return char;
    })
    .join('');
}

function caesarDecode(text: string, shift: number) {
  return caesarEncode(text, (26 - shift) % 26);
}
