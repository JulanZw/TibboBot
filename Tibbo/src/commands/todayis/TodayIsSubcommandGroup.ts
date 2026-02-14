import { SubcommandGroup, Command } from '@julanzw/ttoolbox-discord-framework';

import { LeaderboardCommand } from './subcommands/leaderboard.ts';
import { AddCommand } from './subcommands/add.ts';
import { DeductCommand } from './subcommands/deduct.ts';
import { PointgiverCommand } from './subcommands/pointgiver.ts';

const leaderboardCommand = new LeaderboardCommand();
const addCommand = new AddCommand();
const deductCommand = new DeductCommand();
const pointgiverCommand = new PointgiverCommand();

export class TodayIsSubcommandGroup extends SubcommandGroup {
  name = 'today-is';
  description = 'All commands for today-is';

  protected subcommands = new Map<string, Command>([
    [leaderboardCommand.name, leaderboardCommand],
    [addCommand.name, addCommand],
    [deductCommand.name, deductCommand],
    [pointgiverCommand.name, pointgiverCommand],
  ]);
}
