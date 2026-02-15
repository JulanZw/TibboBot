/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { safeReply } from '../utils/editAndReply.js';
import { getPermissionsForLevel } from '../utils/permissions.js';
import { checkCooldown } from '../utils/cooldown.js';
import { formatDuration } from '../utils/formatting.js';
import { PermissionLevel } from '../types/permission.js';
import { ILogger } from '../types/logger.js';

/**
 * Abstract base class for Discord slash commands.
 *
 * Provides a structured way to create slash commands with built-in validation,
 * error handling, and permission management. Child classes should extend this
 * and implement the required abstract properties and the `run` method.
 *
 * @example
 * ```typescript
 * export class PingCommand extends Command {
 *   name = 'ping';
 *   description = 'Check bot latency';
 *   guildOnly = false;
 *   permissionLevel = 'user' as const;
 *
 *   protected async run(interaction: ChatInputCommandInteraction) {
 *     await safeReply(interaction, `Pong! ${interaction.client.ws.ping}ms`);
 *   }
 * }
 * ```
 */
export abstract class Command {
  /** The command name (used to invoke the command) */
  abstract name: string;

  /** A brief description of what the command does */
  abstract description: string;

  /** Whether this command can only be used in a guild (server) */
  abstract guildOnly: boolean;

  /** The minimum permission level required to use this command */
  abstract permissionLevel: PermissionLevel;

  /** Optional cooldown in milliseconds between command uses per user */
  cooldown?: number;

  /** Logger instance to use inside the command */
  protected logger?: ILogger;

  /**
   * Validates whether the command can be executed in the current context.
   *
   * Checks if the command is being used in the correct context (guild vs DM)
   * and calls additionalValidation for any custom validation logic.
   *
   * @param interaction - The command interaction to validate
   * @returns Error message if validation fails, null if validation passes
   * @protected
   */
  protected validate(interaction: ChatInputCommandInteraction): string | null {
    if (this.guildOnly && !interaction.guildId) {
      return 'This command can only be used in a server.';
    }
    const secondsRemaining = checkCooldown(
      this.name,
      this.cooldown,
      interaction.user.id,
    );

    if (secondsRemaining > 0) {
      return `You need to wait ${formatDuration(secondsRemaining)} before using this command again.`;
    }

    return this.additionalValidation(interaction);
  }

  /**
   * Hook for additional custom validation logic.
   *
   * Override this method in child classes to add command-specific validation.
   * For example, checking if a user has opted in/out, premium status, etc.
   *
   * @param interaction - The command interaction to validate
   * @returns Error message if validation fails, null if validation passes
   * @protected
   *
   * @example
   * ```typescript
   * protected additionalValidation(interaction: ChatInputCommandInteraction): string | null {
   *   if (hasOptedOut(interaction.user.id)) {
   *     return 'You have opted out of this feature.';
   *   }
   *   return null;
   * }
   * ```
   */
  protected additionalValidation(
    interaction: ChatInputCommandInteraction,
  ): string | null {
    return null;
  }

  /**
   * Safely executes a function with error handling and logging.
   *
   * Wraps the execution in a try-catch block, logs successful executions,
   * and automatically handles errors by logging them and sending a user-friendly
   * error message.
   *
   * @param commandName - The name of the command being executed
   * @param interaction - The command interaction
   * @param fn - The function to execute
   * @private
   */
  private async safeExecute(
    commandName: string,
    interaction: ChatInputCommandInteraction,
    fn: () => Promise<any>,
  ) {
    const scope = `${commandName}_EXECUTION`;

    try {
      await fn();
      const subcommandName = interaction.options.getSubcommand(false);
      this.logger?.log(
        `${commandName} ${subcommandName ? `(${subcommandName}) ` : ``}command executed`,
        'info',
        scope,
      );
    } catch (err: any) {
      this.logger?.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `An Error occurred: ${err.message ?? err}`,
        'error',
        scope,
        true,
      );
      return await safeReply(interaction, 'An unexpected error occurred.');
    }
  }

  /**
   * Executes the command with validation and error handling.
   *
   * This is the main entry point when a command is invoked. It performs
   * validation, then calls the `run` method if validation passes.
   * Should not be overridden - override `run` instead.
   *
   * @param interaction - The command interaction
   * @param client - The Discord client instance
   */
  async execute(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    await this.safeExecute(this.name, interaction, async () => {
      const error = this.validate(interaction);
      if (error) return await safeReply(interaction, error, true);
      await this.run(interaction, client);
    });
  }

  /**
   * The main command logic - implement this in child classes.
   *
   * This method is called after all validation passes. Put your command's
   * actual functionality here.
   *
   * @param interaction - The command interaction
   * @param client - The Discord client instance
   * @protected
   *
   * @example
   * ```typescript
   * protected async run(interaction: ChatInputCommandInteraction) {
   *   const user = interaction.options.getUser('user', true);
   *   await safeReply(interaction, `Hello, ${user.tag}!`);
   * }
   * ```
   */
  protected abstract run(
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void>;

  /**
   * Customize the slash command builder with options, choices, etc.
   *
   * Override this method to add options (string, integer, user, etc.) to your command.
   * Works with both standalone commands and subcommands.
   *
   * @param builder - The slash command builder to customize
   * @returns The customized builder
   *
   * @example
   * ```typescript
   * customize(builder: SlashCommandBuilder) {
   *   return builder
   *     .addStringOption(option =>
   *       option
   *         .setName('message')
   *         .setDescription('The message to send')
   *         .setRequired(true)
   *     )
   *     .addUserOption(option =>
   *       option
   *         .setName('user')
   *         .setDescription('The user to mention')
   *         .setRequired(false)
   *     );
   * }
   * ```
   */
  customize?(
    builder: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  ): SlashCommandBuilder | SlashCommandSubcommandBuilder;

  /**
   * Converts the command to Discord API JSON format for registration.
   *
   * This method builds the SlashCommandBuilder with the command's metadata
   * (name, description, permissions) and any custom options, then returns
   * the JSON representation needed for Discord's API.
   *
   * Called automatically by CommandManager when registering commands.
   *
   * @returns The command in Discord API JSON format
   */
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

  /**
   * Sets the logger for this command.
   *
   * @param logger - Logger instance implementing ILogger interface
   */
  setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  /**
   * Log a message using the configured logger.
   *
   * @param message - The message to log
   * @param level - The log level
   * @param scope - The scope/context
   * @param logToConsole - Whether to also log to console
   */
  protected log(
    message: string,
    level: string,
    scope: string,
    logToConsole: boolean = false,
  ): void {
    this.logger?.log(message, level, scope, logToConsole);
  }
}
