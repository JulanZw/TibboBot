import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandSubcommandBuilder,
  TextChannel,
} from 'discord.js';
import {
  PermissionLevel,
  TIMES_MILISECONDS,
  safeReply,
  booleanOption,
  channelOption,
} from '@julanzw/ttoolbox-discordjs-framework';

import { getAllowBackup } from '../database/guild.ts';
import { enqueue } from '../utils/managers/backupQueueManager.ts';
import { BotCommand } from '../impl/BotCommand.class.ts';

export class BackupCommand extends BotCommand {
  name = 'backup';
  description = 'Makes a backup of a channel.';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';
  cooldown = TIMES_MILISECONDS.HOUR;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await safeReply(
        interaction,
        `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
      );
      return;
    }

    if (!(await getAllowBackup(interaction.guildId))) {
      await safeReply(interaction, 'This guild has backups turned off.', true);
      return;
    }

    const channel =
      interaction.options.getChannel('backup_channel') ?? interaction.channel;
    if (!channel || !(channel instanceof TextChannel)) {
      await safeReply(
        interaction,
        'This command only works in text channels.',
        true,
      );
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const position = enqueue(interaction);
    if (position !== 0) {
      await interaction.editReply({
        content: `Your backup is #${position} in the queue`,
      });
    }
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
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
  }
}
