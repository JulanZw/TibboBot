import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

import birthdayCommands from './commands/birthday.ts';
import catCommand from './commands/cat.ts';
import helpCommand from './commands/help.ts';
import wolCommand from './commands/magic.ts';
import manageChannelsCommand from './commands/manage.ts';
import messageCommands from './commands/messages.ts';
import reactionCommands from './commands/reaction.ts';
import reminderCommands from './commands/reminders.ts';
import sourceCommand from './commands/source.ts';
import todayIsCommands from './commands/todayIs.ts';
import { COMMANDS_PER_PAGE } from './utils/globals.ts';
import encodeCommands from './commands/encode.ts';
import optoutCommand from './commands/opt.ts';
import howToCommands from './commands/howto.ts';
import rngCommand from './commands/rng.ts';
import backupCommands from './commands/backup.ts';
import { RegisterableCommand } from './types/commands.ts';
import statsCommands from './commands/stats.ts';
import devCommands from './commands/dev.ts';
import { PingCommand } from './commands/ping.ts';

export const commands: RegisterableCommand[] = [
  wolCommand,
  helpCommand,
  new PingCommand().toRegisterable(),
  rngCommand,
  catCommand,
  backupCommands,
  sourceCommand,
  optoutCommand,
  manageChannelsCommand,
  birthdayCommands,
  messageCommands,
  reminderCommands,
  reactionCommands,
  todayIsCommands,
  encodeCommands,
  howToCommands,
  statsCommands,
];

if (process.env.ENV === 'dev') {
  commands.push(devCommands);
}

export const commandNamesAndDescriptions: { name: string; value: string }[][] =
  (() => {
    const subcommandPages = [];
    const otherCommands: { name: string; value: string }[] = [];

    commands.sort((a, b) => a.name.localeCompare(b.name));

    for (const command of commands) {
      if ('subcommands' in command) {
        const page = [
          {
            name: `─── ${command.name.toUpperCase()} ───`,
            value: command.description || 'No description.',
          },
          ...Array.from(command.subcommands.values()).map((sub) => ({
            name: `› ${sub.name}`,
            value: sub.description,
          })),
        ];
        subcommandPages.push(page);
      } else {
        if (otherCommands.length % COMMANDS_PER_PAGE === 0) {
          otherCommands.push({
            name: `─── OTHER ───`,
            value: 'Other commands',
          });
        }
        otherCommands.push({
          name: `› ${command.name}`,
          value: command.description,
        });
      }
    }

    const allPages = [...subcommandPages];

    while (otherCommands.length) {
      allPages.push(otherCommands.splice(0, COMMANDS_PER_PAGE));
    }
    return allPages;
  })();

export function getCommandsToRegister(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return commands.map((command) => {
    if (process.env.ENV === 'dev') {
      console.log(`Registering: ${command.name}`);
    }
    return command.data.toJSON();
  });
}
