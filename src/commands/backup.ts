import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general.ts';
import { enqueue } from '../utils/backupQueue.ts';
import { booleanOption, channelOption } from '../utils/slashCommandOptions.ts';
import { Subcommand } from '../utils/typesAndInterfaces.ts';
import { TIMES_MILISECONDS } from '../utils/globals.ts';
import { getAllowBackup } from '../database/guild.ts';

const backupCommands = commandBuilder({
  name: 'backup',
  description: 'All commands related to backups.',
  subcommands: new Map<string, Subcommand>([
    [
      'create',
      {
        name: 'create',
        description: 'Makes a backup of a channel.',
        cooldown: TIMES_MILISECONDS.HOUR,
        execute: async (interaction: ChatInputCommandInteraction) => {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          if (!(await getAllowBackup(interaction.guildId))) {
            return await safeReply(
              interaction,
              'This guild has backups turned off.',
              true,
            );
          }

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
          if (position !== 0) {
            await interaction.editReply({
              content: `Your backup is #${position} in the queue`,
            });
          }
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
          // builder.addBooleanOption(
          //   booleanOption(
          //     'download_attachments',
          //     'Should the attachments be downloaded, defaults to false',
          //     false,
          //   ),
          // );
          builder.addBooleanOption(
            booleanOption(
              'password',
              'If the zip should be password protected, defaults to false',
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

export default backupCommands;
