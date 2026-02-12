import { Command } from '../../../core/classes/Command.class.ts';
import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';

import { BreatheCommand } from './subcommands/breathe.ts';
import { EatCommand } from './subcommands/eat.ts';

const breatheCommand = new BreatheCommand();
const eatCommand = new EatCommand();

export class HowToSubcommandGroup extends SubcommandGroup {
  name = 'howto';
  description = 'Silly commands';

  protected subcommands = new Map<string, Command>([
    [breatheCommand.name, breatheCommand],
    [eatCommand.name, eatCommand],
  ]);
}
