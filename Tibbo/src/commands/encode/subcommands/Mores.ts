import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discord-framework';

import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { builderEncodeDecodeCommand } from '../encodeDecodeHelper.ts';

export class MorseCommand extends BotCommand {
  name = 'morse';
  description = 'Encode or decode Morse Code';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction) {
    const mode = interaction.options.getString('mode', true);
    const text = interaction.options.getString('text', true);

    try {
      let result: string;
      if (mode === 'encode') {
        result = morseEncode(text);
      } else {
        result = morseDecode(text);
      }

      await safeReply(interaction, `\`\`\`\n${result}\n\`\`\``, true);
    } catch (err: any) {
      await safeReply(interaction, `Error: ${err}`, true);
    }
  }

  customize() {
    return builderEncodeDecodeCommand('morse', 'Encode or decode Morse code');
  }
}

const morseMap: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
  '0': '-----',
  '1': '.----',
  '2': '..---',
  '3': '...--',
  '4': '....-',
  '5': '.....',
  '6': '-....',
  '7': '--...',
  '8': '---..',
  '9': '----.',
  ' ': '/',
};

const morseMapReverse = Object.fromEntries(
  Object.entries(morseMap).map(([k, v]) => [v, k]),
);

function morseEncode(text: string) {
  return text
    .toUpperCase()
    .split('')
    .map((char) => morseMap[char] || '')
    .join(' ');
}

function morseDecode(morse: string) {
  return morse
    .split(' ')
    .map((code) => morseMapReverse[code] || '')
    .join('');
}
