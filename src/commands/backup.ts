import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { enqueue } from '../utils/backupQueue';
import { booleanOption, channelOption } from '../utils/slashCommandOptions';
import { Subcommand } from '../utils/typesAndInterfaces';
import { COOLDOWN_TIMES_MILISECONDS } from '../utils/globals';

export const backupCommands = commandBuilder({
  name: 'backup',
  description: 'All commands related to backups.',
  subcommands: new Map<string, Subcommand>([
    [
      'create',
      {
        name: 'create',
        description: 'Makes a backup of a channel.',
        cooldown: COOLDOWN_TIMES_MILISECONDS.HOUR,
        execute: async (interaction: ChatInputCommandInteraction) => {
          const channel =
            interaction.options.getChannel('backupChannel', false) ??
            interaction.channel;
          if (!channel || !(channel instanceof TextChannel)) {
            return await safeReply(
              interaction,
              'This command only works in text channels.',
              true,
            );
          }

          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const position = enqueue(interaction);

          await interaction.editReply({
            content: `Backup is ${position === 0 ? 'being worked on...' : `#${position} in queue`}`,
          });
        },
        customize: (builder) => {
          builder.addChannelOption(
            channelOption(
              'backup_channel',
              'the channel the backup needs to be of, defaults to the current channel',
              false,
              ChannelType.GuildText,
            ),
          );
          builder.addBooleanOption(
            booleanOption(
              'download_attachments',
              'Should the attachments be downloaded, defaults to false',
              false,
            ),
          );
          return builder;
        },
        guildOnly: true,
        permissionLevel: 'user',
      },
    ],
  ]),
});
