import { ChatInputCommandInteraction } from 'discord.js';
import {
  PaginatedEmbed,
  embedBuilder,
} from '@julanzw/ttoolbox-discordjs-framework';

import { BotCommand } from '../impl/BotCommand.class.ts';
import { COMMANDS_PER_PAGE } from '../utils/globals.ts';
import { commandManager } from '../index.ts';

export class HelpCommand extends BotCommand {
  name = 'help';
  description = 'Displays all commands.';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandNamesAndDescriptions =
      commandManager.getHelpPages(COMMANDS_PER_PAGE);
    const paginator = new PaginatedEmbed(
      interaction,
      commandNamesAndDescriptions,
      (_, index, total) => [
        embedBuilder({
          title: 'List of Available Commands',
          fields: commandNamesAndDescriptions[index] ?? [],
          footer: `Page ${index + 1} of ${total}`,
        }),
      ],
    );

    await paginator.start();
  }
}
