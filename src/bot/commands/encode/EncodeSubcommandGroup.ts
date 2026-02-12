import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';
import { Command } from '../../../core/classes/Command.class.ts';

import { Base64Command } from './subcommands/Base64.ts';
import { MorseCommand } from './subcommands/Mores.ts';
import { CeaserCommand } from './subcommands/Ceaser.ts';

const base64Command = new Base64Command();
const morseCommand = new MorseCommand();
const ceaserCommand = new CeaserCommand();

export class EncodeCommands extends SubcommandGroup {
  name = 'encode';
  description = 'Encode or decode text using various methods';

  protected subcommands = new Map<string, Command>([
    [base64Command.name, base64Command],
    [morseCommand.name, morseCommand],
    [ceaserCommand.name, ceaserCommand],
  ]);
}
