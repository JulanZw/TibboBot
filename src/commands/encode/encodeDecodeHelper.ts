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
