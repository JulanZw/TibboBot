/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
} from 'discord.js';

import { PermissionLevel } from '../types/permission.ts';
import { safeReply } from '../utils/editAndReply.ts';
import { getPermissionsForLevel } from '../utils/permissions.ts';
import { logWithTime } from '../utils/logging.ts';
// ! will be removed later
import { RegisterableCommand } from '../../bot/types/commands.ts';

export abstract class Command {
  abstract name: string;
  abstract description: string;
  abstract guildOnly: boolean;
  abstract permissionLevel: PermissionLevel;

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
    scope: string,
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    await this.safeExecute(this.name, scope, interaction, async () => {
      const error = this.validate(interaction);
      if (error) return await safeReply(interaction, error, true);
      await this.run(interaction, client);
    });
  }

  protected abstract run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;

  // ! backwards compatibility with old command system, will be removed later
  toRegisterable(): RegisterableCommand {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .setDefaultMemberPermissions(
        getPermissionsForLevel(this.permissionLevel),
      );

    return {
      name: this.name,
      description: this.description,
      guildOnly: this.guildOnly,
      permissionLevel: this.permissionLevel,
      data: builder,
      execute: (interaction: ChatInputCommandInteraction, client: Client) =>
        this.execute(`${this.name}_EXECUTION`, interaction, client),
    };
  }

  toJSON() {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .setDefaultMemberPermissions(
        getPermissionsForLevel(this.permissionLevel),
      );
    return builder.toJSON();
  }
}
