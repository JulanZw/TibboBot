import { SubcommandGroup } from '../../../core/commands/SubcommandGroup.class.ts';
import { Command } from '../../../core/commands/Command.class.ts';

import { Base64Command } from './subcommands/Base64.ts';
import { MorseCommand } from './subcommands/Mores.ts';
import { CeaserCommand } from './subcommands/Ceaser.ts';

export class EncodeCommands extends SubcommandGroup {
  name = 'encode';
  description = 'Encode or decode text using various methods';

  protected subcommands = new Map<string, Command>([
    ['base64', new Base64Command()],
    ['morse', new MorseCommand()],
    ['caesar', new CeaserCommand()],
  ]);
}
