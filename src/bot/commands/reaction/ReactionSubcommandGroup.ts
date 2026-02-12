import { Command } from '../../../core/classes/Command.class.ts';
import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';

import { AddReactionCommand } from './subcommands/add.ts';
import { CreateReactionCommand } from './subcommands/create.ts';

const addCommand = new AddReactionCommand();
const createCommand = new CreateReactionCommand();

export class ReactionSubcommandGroup extends SubcommandGroup {
  name = 'reaction';
  description = 'All commands for creating and updating a reaction message';

  protected subcommands = new Map<string, Command>([
    [addCommand.name, addCommand],
    [createCommand.name, createCommand],
  ]);
}
