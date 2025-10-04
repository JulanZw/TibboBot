import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

import birthdayCommands from './commands/birthday.ts';
import catCommand from './commands/cat.ts';
import helpCommand from './commands/help.ts';
import wolCommand from './commands/magic.ts';
import manageChannelsCommand from './commands/manage.ts';
import messageCommands from './commands/messages.ts';
import pingCommand from './commands/ping.ts';
import reactionCommands from './commands/reaction.ts';
import reminderCommands from './commands/reminders.ts';
import sourceCommand from './commands/source.ts';
import todayIsCommands from './commands/todayIs.ts';
import { RegisterableCommand } from './utils/typesAndInterfaces.ts';
import { COMMANDS_PER_PAGE } from './utils/globals.ts';
import encodeCommands from './commands/encode.ts';
import optoutCommand from './commands/opt.ts';
import howToCommands from './commands/howto.ts';
import rngCommand from './commands/rng.ts';
import backupCommands from './commands/backup.ts';

/**
 * Represents a Discord slash command definition.
 *
 * Used internally to register and execute slash commands,
 * and to apply custom restrictions like admin or guild-only use.
 *
 * @property data - The actual slash command builder used for Discord.
 * @property name - The name of the command.
 * @property description - The description of the command.
 * @property adminOnly - Whether the command can only be executed by an admin (internal check).
 * @property guildOnly - Whether the command can only be executed in a guild (internal check).
 * @property execute - The function that runs when the command is used.
 */

export const commands: RegisterableCommand[] = [
  wolCommand,
  helpCommand,
  pingCommand,
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
];

export const commandNamesAndDescriptions: { name: string; value: string }[][] =
  (() => {
    const subcommandPages = [];
    const otherCommands: { name: string; value: string }[] = [];

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

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] =
  commands.map((command) => {
    if (process.env.ENV === 'dev') {
      console.log(`Registering: ${command.name}`);
    }
    return command.data.toJSON();
  });
