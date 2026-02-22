import {
  Command,
  SubcommandGroup,
} from '@julanzw/ttoolbox-discordjs-framework';

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
