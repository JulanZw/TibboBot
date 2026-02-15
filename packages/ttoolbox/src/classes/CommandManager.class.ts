import {
  ChatInputCommandInteraction,
  Client,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

import { ILogger } from '../types/logger.js';

import { Command } from './Command.class.js';
import { SubcommandGroup } from './SubcommandGroup.class.js';

export class CommandManager {
  private commands: Map<string, Command | SubcommandGroup> = new Map();
  protected logger?: ILogger;

  /**
   * Register a single command or subcommand group
   */
  register(command: Command | SubcommandGroup): this {
    if (this.logger) {
      command.setLogger(this.logger);
    }
    this.commands.set(command.name, command);
    return this;
  }

  /**
   * Register multiple commands at once
   */
  registerMultiple(commands: Array<Command | SubcommandGroup>): this {
    commands.forEach((cmd) => this.register(cmd));
    return this;
  }

  /**
   * Get a specific command by name
   */
  get(name: string): Command | SubcommandGroup | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all registered commands
   */
  getAll(): Array<Command | SubcommandGroup> {
    return Array.from(this.commands.values());
  }

  /**
   * Get all commands sorted alphabetically by name
   */
  getAllSorted(): Array<Command | SubcommandGroup> {
    return this.getAll().sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Convert all commands to Discord JSON format for registration
   */
  toDiscordJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
    return this.getAll().map((cmd) => {
      if (process.env.ENV === 'dev') {
        console.log(`Registering: ${cmd.name}`);
      }
      return cmd.toJSON();
    });
  }

  /**
   * Generate paginated help pages for display in help command
   * Returns a 2D array where each inner array is a page of command descriptions
   *
   * @param commandsPerPage - How many regular commands to show per page (default: 10)
   * @returns 2D array of command info for pagination
   */
  getHelpPages(
    commandsPerPage: number = 5,
  ): Array<Array<{ name: string; value: string }>> {
    const subcommandPages: Array<Array<{ name: string; value: string }>> = [];
    const otherCommands: Array<{ name: string; value: string }> = [];

    for (const command of this.getAllSorted()) {
      if (command instanceof SubcommandGroup) {
        // Each subcommand group gets its own page
        const page = [
          {
            name: `─── ${command.name.toUpperCase()} ───`,
            value: command.description || 'No description.',
          },
          ...command.getSubcommandList().map((sub) => ({
            name: `› ${sub.name}`,
            value: sub.description,
          })),
        ];
        subcommandPages.push(page);
      } else {
        // Regular commands are grouped together
        // Add a header when starting a new page
        if (otherCommands.length % commandsPerPage === 0) {
          otherCommands.push({
            name: `─── OTHER ───`,
            value: 'Other commands',
          });
        }
        otherCommands.push({
          name: `› ${command.name}`,
          value: command.description,
        });
      }
    }

    // Combine subcommand pages first, then regular command pages
    const allPages = [...subcommandPages];

    // Split regular commands into pages
    while (otherCommands.length) {
      allPages.push(otherCommands.splice(0, commandsPerPage));
    }

    return allPages;
  }

  /**
   * Execute a command by name
   * This is called from your interaction handler
   */
  async executeCommand(
    commandName: string,
    interaction: ChatInputCommandInteraction,
    client: Client,
  ): Promise<void> {
    const command = this.get(commandName);

    if (!command) {
      throw new Error(`Command not found: ${commandName}`);
    }

    await command.execute(interaction, client);
  }

  /**
   * Get total number of registered commands
   */
  get size(): number {
    return this.commands.size;
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * Remove a command (useful for hot-reloading in dev)
   */
  unregister(name: string): boolean {
    return this.commands.delete(name);
  }

  /**
   * Clear all commands
   */
  clear(): void {
    this.commands.clear();
  }

  /**
   * Get command names as an array
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }

  setLogger(logger: ILogger): this {
    this.logger = logger;

    // Inject logger into all already-registered commands
    for (const command of this.commands.values()) {
      command.setLogger(logger);
    }

    return this;
  }
}
