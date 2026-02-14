import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discord-framework';

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
