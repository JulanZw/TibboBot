import { Command } from '../../../core/classes/Command.class.ts';
import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';

import { OptInCommand } from './subcommands/optin.ts';
import { OptOutCommand } from './subcommands/optout.ts';

const optOutCommand = new OptOutCommand();
const optInCommand = new OptInCommand();

export class OptOutSubcommandGroup extends SubcommandGroup {
  name = 'opt';
  description = 'The commands for opting in and out of data collection';

  protected subcommands = new Map<string, Command>([
    [optOutCommand.name, optOutCommand],
    [optInCommand.name, optInCommand],
  ]);
}
