import { ChatInputCommandInteraction } from 'discord.js';

import { embedBuilder } from '../utils/discord/embeds.ts';
import { PaginatedEmbed } from '../../core/utils/PaginatedEmbed.class.ts';
import { commandManager } from '../commands.ts';

import { BotCommand } from './classes/BotCommand.class.ts';

export class HelpCommand extends BotCommand {
  name = 'help';
  description = 'Displays all commands.';
  guildOnly = false;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    const commandNamesAndDescriptions = commandManager.getHelpPages();
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
