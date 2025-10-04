import { ChatInputCommandInteraction } from 'discord.js';

import { safeReply } from '../utils/discord/editAndReply.ts';
import { Subcommand } from '../types/commands.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';
import {
  builderEncodeDecodeCommand,
  morseEncode,
  morseDecode,
  caesarDecode,
  caesarEncode,
} from '../utils/encodeDecode.ts';

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
