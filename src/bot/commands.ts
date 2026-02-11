import { CommandManager } from '../core/commands/CommandManager.class.ts';

import { SourceCommand } from './commands/source.ts';
import { PingCommand } from './commands/ping.ts';
import { EncodeCommands } from './commands/encode/EncodeCommandGroup.ts';
import { DevCommand } from './commands/dev.ts';
import { CatCommand } from './commands/cat.ts';
import { HelpCommand } from './commands/help.ts';
import { MagicCommand } from './commands/magic.ts';
import { RngCommand } from './commands/rng.ts';

export const commandManager = new CommandManager().registerMultiple([
  new PingCommand(),
  new SourceCommand(),
  new EncodeCommands(),
  new CatCommand(),
  new HelpCommand(),
  new MagicCommand(),
  new RngCommand(),
]);

if (process.env.ENV === 'dev') {
  commandManager.register(new DevCommand());
}

export const discordJSON = commandManager.toDiscordJSON();
