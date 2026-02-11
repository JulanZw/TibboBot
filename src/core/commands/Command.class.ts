/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { PermissionLevel } from '../types/permission.ts';
import { safeReply } from '../utils/editAndReply.ts';
import { getPermissionsForLevel } from '../utils/permissions.ts';
import { logWithTime } from '../utils/logging.ts';

export abstract class Command {
  abstract name: string;
  abstract description: string;
  abstract guildOnly: boolean;
  abstract permissionLevel: PermissionLevel;
  cooldown?: number;

  protected validate(interaction: ChatInputCommandInteraction): string | null {
    if (this.guildOnly && !interaction.guildId) {
      return 'This command can only be used in a server.';
    }

    return this.additionalValidation(interaction);
  }

  // Override if needed
  protected additionalValidation(
    interaction: ChatInputCommandInteraction,
  ): string | null {
    return null;
  }

  private async safeExecute(
    commandName: string,
    interaction: ChatInputCommandInteraction,
    fn: () => Promise<any>,
  ) {
    const scope = `${commandName}_EXECUTION`;

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
    await this.safeExecute(this.name, interaction, async () => {
      const error = this.validate(interaction);
      console.log('Validation result for', this.name, ':', error);
      if (error) return await safeReply(interaction, error, true);
      console.log('Validation passed for', this.name);
      await this.run(interaction, client);
    });
  }

  protected abstract run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;

  customize?(
    builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  ): SlashCommandBuilder | SlashCommandSubcommandBuilder;

  toJSON() {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .setDefaultMemberPermissions(
        getPermissionsForLevel(this.permissionLevel),
      );

    if (this.customize) {
      this.customize(builder);
    }

    return builder.toJSON();
  }
}
