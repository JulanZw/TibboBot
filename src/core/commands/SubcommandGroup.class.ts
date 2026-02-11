import {
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { safeReply } from '../utils/editAndReply.ts';
import { logWithTime } from '../utils/logging.ts';

import { Command } from './Command.class.ts';

export abstract class SubcommandGroup {
  abstract name: string;
  abstract description: string;
  protected abstract subcommands: Map<string, Command>;

  private async safeExecute(
    commandName: string,
    scope: string,
    interaction: ChatInputCommandInteraction,
    fn: () => Promise<any>,
  ) {
    try {
      await fn();
      const subcommandName = interaction.options.getSubcommand(false);
      logWithTime(
        `${commandName} ${subcommandName ? `(${subcommandName}) ` : ``}command executed`,
        'info',
        scope,
      );
    } catch (err: any) {
      logWithTime('An Error occured' + err, 'error', scope, true);
      return await safeReply(interaction, 'An unexpected error occurred.');
    }
  }

  async execute(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    const subcommandName = interaction.options.getSubcommand();
    const subcommand = this.subcommands.get(subcommandName);

    if (!subcommand) {
      throw new Error(`Unknown subcommand: ${subcommandName}`);
    }

    const scope = `${subcommand.name}_EXECUTION`;

    await this.safeExecute(this.name, scope, interaction, () =>
      subcommand.execute(interaction, client),
    );
  }

  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);

    for (const [name, sub] of this.subcommands) {
      builder.addSubcommand((sc) => {
        const configured = (sub.customize ?? ((b) => b))(
          sc.setName(name).setDescription(sub.description),
        );
        return configured as SlashCommandSubcommandBuilder;
      });
    }

    return builder.toJSON();
  }

  getSubcommandList(): Array<{ name: string; description: string }> {
    return Array.from(this.subcommands.values()).map((sub) => ({
      name: sub.name,
      description: sub.description,
    }));
  }
}
