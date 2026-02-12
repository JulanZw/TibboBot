import { Command } from '../../../core/classes/Command.class.ts';
import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';

import { SetBirthdayCommand } from './subcommands/set.ts';
import { CalendarBirthdayCommand } from './subcommands/calender.ts';

const setBirthdayCommand = new SetBirthdayCommand();
const calendarBirthdayCommand = new CalendarBirthdayCommand();

export class BirthdaySubcommandGroup extends SubcommandGroup {
  name = 'birthday';
  description = 'All commands related to birthdays';

  protected subcommands = new Map<string, Command>([
    [setBirthdayCommand.name, setBirthdayCommand],
    [calendarBirthdayCommand.name, calendarBirthdayCommand],
  ]);
}
