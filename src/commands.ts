import { CommandManager } from '@julanzw/ttoolbox-discordjs-framework';

import { SourceCommand } from './commands/source.ts';
import { PingCommand } from './commands/ping.ts';
import { EncodeCommands } from './commands/encode/EncodeSubcommandGroup.ts';
import { DevCommand } from './commands/dev.ts';
import { CatCommand } from './commands/cat.ts';
import { HelpCommand } from './commands/help.ts';
import { MagicCommand } from './commands/magic.ts';
import { RngCommand } from './commands/rng.ts';
import { HowToSubcommandGroup } from './commands/howto/HowToSubcommandGroup.ts';
import { ManageSubcommandGroup } from './commands/manage/ManageSubcommandGroup.ts';
import { MessagesSubcommandGroup } from './commands/messages/MessageSubcommandGroup.ts';
import { OptOutSubcommandGroup } from './commands/opt/OptSubcommandGroup.ts';
import { TodayIsSubcommandGroup } from './commands/todayis/TodayIsSubcommandGroup.ts';
import { StatsSubcommandGroup } from './commands/stats/StatsSubcommandGroup.ts';
import { ReminderSubcommandGroup } from './commands/reminder/ReminderSubcommandGroup.ts';
import { ReactionSubcommandGroup } from './commands/reaction/ReactionSubcommandGroup.ts';
import { BirthdaySubcommandGroup } from './commands/birthday/BirthdaySubcommandGroup.ts';
import { BackupCommand } from './commands/backup.ts';

export function registerCommands(commandManager: CommandManager) {
  commandManager.registerMultiple([
    new PingCommand(),
    new SourceCommand(),
    new EncodeCommands(),
    new CatCommand(),
    new HelpCommand(),
    new MagicCommand(),
    new RngCommand(),
    new EncodeCommands(),
    new TodayIsSubcommandGroup(),
    new HowToSubcommandGroup(),
    new ManageSubcommandGroup(),
    new MessagesSubcommandGroup(),
    new OptOutSubcommandGroup(),
    new StatsSubcommandGroup(),
    new ReminderSubcommandGroup(),
    new ReactionSubcommandGroup(),
    new BirthdaySubcommandGroup(),
    new BackupCommand(),
  ]);

  if (process.env.ENV === 'dev') {
    commandManager.register(new DevCommand());
  }
}
