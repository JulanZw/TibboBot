import { Command } from '../../../core/classes/Command.class.ts';
import { SubcommandGroup } from '../../../core/classes/SubcommandGroup.class.ts';

import { LeaderboardCommand } from './subcommands/leaderboard.ts';
import { UserCommand } from './subcommands/user.ts';

const leaderboardCommand = new LeaderboardCommand();
const userCommand = new UserCommand();

export class MessagesSubcommandGroup extends SubcommandGroup {
  name = 'messages';
  description = 'All commands related to messages';

  protected subcommands = new Map<string, Command>([
    [leaderboardCommand.name, leaderboardCommand],
    [userCommand.name, userCommand],
  ]);
}
