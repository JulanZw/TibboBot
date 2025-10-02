import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general.ts';
import { Subcommand } from '../utils/typesAndInterfaces.ts';

function builderEncodeDecodeCommand(name: string, desc: string) {
  return new SlashCommandSubcommandBuilder()
    .setName(name)
    .setDescription(desc)
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Encode or decode')
        .setRequired(true)
        .addChoices(
          { name: 'Encode', value: 'encode' },
          { name: 'Decode', value: 'decode' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('The text to process')
        .setRequired(true),
    );
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

const encodeCommands = commandBuilder({
  name: 'encode',
  description: 'Encode or decode text using Base64 or Morse code',
  subcommands: new Map<string, Subcommand>([
    [
      'base64',
      {
        name: 'base64',
        description: 'Encode or decode Base64',
        async execute(interaction: ChatInputCommandInteraction) {
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
        },
        customize: () => {
          return builderEncodeDecodeCommand(
            'base64',
            'Encode or decode Base64',
          );
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
    [
      'morse',
      {
        name: 'morse',
        description: 'Encode or decode Morse code',
        async execute(interaction: ChatInputCommandInteraction) {
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
        },
        customize: () => {
          return builderEncodeDecodeCommand(
            'morse',
            'Encode or decode Morse code',
          );
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
    [
      'caesar',
      {
        name: 'caesar',
        description: 'Encode or decode using Caesar cipher',
        async execute(interaction: ChatInputCommandInteraction) {
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
        },
        customize: () => {
          return builderEncodeDecodeCommand(
            'caesar',
            'Encode or decode using Caesar cipher',
          ).addIntegerOption((option) =>
            option
              .setName('shift')
              .setDescription('Shift amount (1-25)')
              .setRequired(true),
          );
        },
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
  ]),
});

export default encodeCommands;
