import {
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from 'discord.js';

import { safeReply } from '../utils/editAndReply.js';
import { ILogger } from '../types/logger.js';

import { Command } from './Command.class.js';

/**
 * Abstract base class for Discord slash command groups with subcommands.
 *
 * Use this when you have multiple related commands that should be grouped together
 * under a single parent command.
 *
 * For example, `/birthday set` and `/birthday calendar`
 * would both be subcommands of a `BirthdayCommands` subcommand group.
 *
 * @example
 * ```typescript
 * export class BirthdayCommands extends SubcommandGroup {
 *   name = 'birthday';
 *   description = 'All commands related to birthdays';
 *
 *   protected subcommands = new Map<string, Command>([
 *     ['set', new SetBirthdayCommand()],
 *     ['calendar', new CalendarCommand()],
 *   ]);
 * }
 * ```
 */
export abstract class SubcommandGroup {
  /** The parent command name (e.g., 'birthday' for `/birthday set`) */
  abstract name: string;

  /** A brief description of the command group */
  abstract description: string;

  /** Map of subcommand names to Command instances */
  protected abstract subcommands: Map<string, Command>;

  /** The logger instance used in the subcommand group */
  protected logger?: ILogger;

  /**
   * Safely executes a function with error handling and logging.
   *
   * Wraps the execution in a try-catch block, logs successful executions,
   * and automatically handles errors by logging them and sending a user-friendly
   * error message.
   *
   * @param commandName - The name of the parent command
   * @param scope - The logging scope for this execution
   * @param interaction - The command interaction
   * @param fn - The function to execute
   * @private
   */
  private async safeExecute(
    commandName: string,
    scope: string,
    interaction: ChatInputCommandInteraction,
    fn: () => Promise<any>,
  ) {
    try {
      await fn();
      const subcommandName = interaction.options.getSubcommand(false);
      this.logger?.log(
        `${commandName} ${subcommandName ? `(${subcommandName}) ` : ``}command executed`,
        'info',
        scope,
      );
    } catch (err: any) {
      this.logger?.log('An Error occured' + err, 'error', scope, true);
      return await safeReply(interaction, 'An unexpected error occurred.');
    }
  }

  /**
   * Executes the appropriate subcommand based on the user's interaction.
   *
   * This method:
   * 1. Determines which subcommand was invoked
   * 2. Looks up the corresponding Command instance
   * 3. Executes the subcommand with error handling
   *
   * Called automatically by the CommandManager when this command group is invoked.
   *
   * @param interaction - The command interaction
   * @param client - The Discord client instance
   * @throws {Error} If the subcommand name doesn't exist in the subcommands map
   *
   * @example
   * When a user runs `/birthday set`, this method:
   * - Gets "set" from interaction.options.getSubcommand()
   * - Looks up the SetBirthdayCommand in the subcommands map
   * - Calls SetBirthdayCommand.execute()
   */
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

  /**
   * Converts the command group to Discord API JSON format for registration.
   *
   * This method:
   * 1. Creates a SlashCommandBuilder with the group's name and description
   * 2. Adds each subcommand from the subcommands map
   * 3. Applies any custom options from each subcommand's `customize` method
   * 4. Returns the JSON representation needed for Discord's API
   *
   * Called automatically by CommandManager when registering commands.
   *
   * @returns The command group in Discord API JSON format
   *
   * @example
   * For a birthday command group with "set" and "calendar" subcommands,
   * this creates the structure for:
   * - `/birthday set <options>`
   * - `/birthday calendar`
   */
  toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
    const builder = new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description);

    for (const cmd of this.subcommands.values()) {
      builder.addSubcommand((sc) => {
        sc.setName(cmd.name).setDescription(cmd.description);

        if (cmd.customize) {
          cmd.customize(sc);
        }

        return sc;
      });
    }

    return builder.toJSON();
  }

  /**
   * Gets a list of all subcommands with their names and descriptions.
   *
   * Useful for generating help text or documentation about available subcommands.
   * Used by CommandManager's `getHelpPages` method to display subcommands in the help command.
   *
   * @returns Array of objects containing subcommand names and descriptions
   *
   * @example
   * ```typescript
   * const subcommands = birthdayCommands.getSubcommandList();
   * // Returns:
   * // [
   * //   { name: 'set', description: 'Set your birthday' },
   * //   { name: 'calendar', description: 'View birthday calendar' }
   * // ]
   * ```
   */
  getSubcommandList(): Array<{ name: string; description: string }> {
    return Array.from(this.subcommands.values()).map((sub) => ({
      name: sub.name,
      description: sub.description,
    }));
  }

  /**
   * Sets the logger for this subcommand group.
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
