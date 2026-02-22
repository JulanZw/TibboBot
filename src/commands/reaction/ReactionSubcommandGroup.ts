import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discordjs-framework';

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
