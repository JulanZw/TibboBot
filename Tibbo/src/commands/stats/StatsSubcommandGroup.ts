import { Command, SubcommandGroup } from '@julanzw/ttoolbox-discord-framework';

import { GuildStatsCommand } from './subcommands/guild.ts';
import { UserStatsCommand } from './subcommands/user.ts';

const guildStatsCommand = new GuildStatsCommand();
const userStatsCommand = new UserStatsCommand();

export class StatsSubcommandGroup extends SubcommandGroup {
  name = 'stats';
  description = 'All commands related to statistics.';

  protected subcommands = new Map<string, Command>([
    [guildStatsCommand.name, guildStatsCommand],
    [userStatsCommand.name, userStatsCommand],
  ]);
}
