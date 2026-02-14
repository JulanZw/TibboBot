import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discord-framework';

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
