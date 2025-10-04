import { SlashCommandSubcommandBuilder } from 'discord.js';

export function builderEncodeDecodeCommand(name: string, desc: string) {
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

export function morseEncode(text: string) {
  return text
    .toUpperCase()
    .split('')
    .map((char) => morseMap[char] || '')
    .join(' ');
}

export function morseDecode(morse: string) {
  return morse
    .split(' ')
    .map((code) => morseMapReverse[code] || '')
    .join('');
}

export function caesarEncode(text: string, shift: number) {
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

export function caesarDecode(text: string, shift: number) {
  return caesarEncode(text, (26 - shift) % 26);
}
