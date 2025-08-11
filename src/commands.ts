import { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

import { birthdayCommands } from './commands/birthday';
import { catCommand } from './commands/cat';
import { helpCommand } from './commands/help';
import { wolCommand } from './commands/magic';
import { manageChannelsCommand } from './commands/manage';
import { messageCommands } from './commands/messages';
import { pingCommand } from './commands/ping';
import { reactionCommands } from './commands/reaction';
import { reminderCommands } from './commands/reminders';
import { sourceCommand } from './commands/source';
import { todayIsCommands } from './commands/todayIs';
import { Command } from './utils/typesAndInterfaces';
import { COMMANDS_PER_PAGE } from './utils/constants';

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

export const commands: Command[] = [
  wolCommand,
  helpCommand,
  pingCommand,
  catCommand,
  sourceCommand,
  manageChannelsCommand,
  birthdayCommands,
  messageCommands,
  reminderCommands,
  reactionCommands,
  todayIsCommands,
];

export const commandNamesAndDescriptions: { name: string; value: string }[][] =
  (() => {
    const subcommandPages = [];
    const otherCommands: { name: string; value: string }[] = [];

    for (const command of commands) {
      if (command.subcommands?.size) {
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
  commands.map((command) => command.data.toJSON());
