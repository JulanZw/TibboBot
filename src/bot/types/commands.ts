import {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import { PermissionLevel } from './permission.ts';

type BaseCommand = {
  /**
   * The command name, used to invoke it.
   * For subcommands, this is the subcommand group name.
   */
  name: string;
  /**
   * A short description of what the command or subcommands does.
   */
  description: string;
  /**
   * Optional cooldown in milliseconds between uses of this command per user.
   * If not set, the command can be used without restriction.
   */
  cooldown?: number;
};

type RegularCommand = BaseCommand & {
  /**
   * Whether this command can only be used inside a guild (server).
   */
  guildOnly: boolean;
  /**
   * The required permission level to use this command.
   */
  permissionLevel: PermissionLevel;
  /**
   * The function that will run when the command is invoked.
   */
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
  /**
   * (Optional) A function to further configure the `SlashCommandBuilder`,
   * by for example adding arguments or options.
   */
  customize?: (builder: SlashCommandBuilder) => SlashCommandBuilder;
};

type CommandWithSubcommands = BaseCommand & {
  /**
   * A map of subcommand names to their corresponding Subcommand definitions.
   */
  subcommands: Map<string, Subcommand>;
};

/**
 * A developer-facing description of a Discord command.
 *
 * Two forms are supported:
 * - **RegularCommand**: A top-level command with its own `execute` function.
 *   Includes metadata like `guildOnly`, `permissionLevel`, and optional
 *   `customize` builder logic.
 * - **CommandWithSubcommands**: A top-level command that groups multiple
 *   subcommands. Each subcommand defines its own `execute` function and metadata.
 */
export type Command = RegularCommand | CommandWithSubcommands;

/**
 * The unified runtime form of a command that can be registered with Discord.js.
 *
 * A `Registerable` always includes:
 * - `data`: The `SlashCommandBuilder` used to register the command with Discord.
 * - `execute`: The handler called when the command (or one of its subcommands)
 *   is invoked at runtime.
 *
 */
export interface Registerable {
  /**
   * The `SlashCommandBuilder` used to register the command with Discord.
   */
  data: SlashCommandBuilder;
  /**
   * The handler called when the command (or one of its subcommands)
   * is invoked at runtime.
   */
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
}

export type RegisterableCommand =
  | (Registerable & RegularCommand)
  | (Registerable & CommandWithSubcommands);

/**
 * Represents a single subcommand that belongs to a parent command.
 *
 * A `Subcommand` is similar to a regular command but exists only within the
 * context of its parent. It can have its own permissions, guild-only flag,
 * description, and execution logic.
 *
 * @property name - The subcommand name.
 * @property description - A short description of what the subcommand does.
 * @property execute - The function that will run when the subcommand is invoked.
 * @property customize - (Optional) A function to further configure the
 *          `SlashCommandSubcommandBuilder`, by for example adding arguments or options.
 * @property permissionLevel - The required permission level to use this subcommand.
 * @property guildOnly - Whether this subcommand can only be used inside a guild.
 *
 * Example:
 * ```ts
 * const banSubcommand: Subcommand = {
 *   name: "ban",
 *   description: "Ban a user from the server",
 *   guildOnly: true,
 *   permissionLevel: PermissionLevel.Admin,
 *   execute: async (interaction, client) => {
 *     const user = interaction.options.getUser("target", true);
 *     await interaction.guild?.members.ban(user.id);
 *     await interaction.reply(`${user.tag} has been banned.`);
 *   },
 *   customize: (sub) =>
 *     sub.addUserOption(opt =>
 *       opt.setName("target")
 *         .setDescription("User to ban")
 *         .setRequired(true)
 *     ),
 * };
 * ```
 */
export type Subcommand = BaseCommand & {
  /**
   * The function that will run when the subcommand is invoked.
   */
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
  /**
   * (Optional) A function to further configure the
   * `SlashCommandSubcommandBuilder`, by for example adding arguments or options.
   */
  customize?: (
    sub: SlashCommandSubcommandBuilder,
  ) => SlashCommandSubcommandBuilder;
  /**
   * The required permission level to use this subcommand.
   */
  permissionLevel: PermissionLevel;
  /**
   * Whether this subcommand can only be used inside a guild.
   */
  guildOnly: boolean;
};
