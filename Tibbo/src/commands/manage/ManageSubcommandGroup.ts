import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discord-framework';

import { BackupCommand } from './subcommands/backups.ts';
import { ChannelCommand } from './subcommands/channels.ts';
import { DataCommand } from './subcommands/data.ts';
import { TodayIsResetCommand } from './subcommands/todayIsReset.ts';

const channelCommand = new ChannelCommand();
const backupCommand = new BackupCommand();
const dataCommand = new DataCommand();
const todayIsResetCommand = new TodayIsResetCommand();

export class ManageSubcommandGroup extends SubcommandGroup {
  name = 'manage';
  description =
    'All commands related to managing things for the bot inside the guild';
  protected subcommands = new Map<string, Command>([
    [channelCommand.name, channelCommand],
    [backupCommand.name, backupCommand],
    [dataCommand.name, dataCommand],
    [todayIsResetCommand.name, todayIsResetCommand],
  ]);
}
