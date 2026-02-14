import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discord-framework';

import { AddReminderCommand } from './subcommands/add.ts';
import { ListRemindersCommand } from './subcommands/list.ts';

const addReminderCommand = new AddReminderCommand();
const listRemindersCommand = new ListRemindersCommand();

export class ReminderSubcommandGroup extends SubcommandGroup {
  name = 'reminder';
  description = 'All commands related to your reminders';

  protected subcommands = new Map<string, Command>([
    [addReminderCommand.name, addReminderCommand],
    [listRemindersCommand.name, listRemindersCommand],
  ]);
}
