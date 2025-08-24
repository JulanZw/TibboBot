import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';

export type BotChannel = 'count' | 'today-is' | 'birthday';

export type ButtonType = 'prev' | 'next' | 'edit' | 'delete';

export type LogLevel = 'info' | 'warn' | 'error';

type BaseCommand = {
  name: string;
  description: string;
};

type RegularCommand = BaseCommand & {
  guildOnly: boolean;
  permissionLevel: PermissionLevel;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
  customize?: (builder: SlashCommandBuilder) => SlashCommandBuilder;
};

type CommandWithSubcommands = BaseCommand & {
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

interface RegisterableCommand {
  data: SlashCommandBuilder;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
}

/**
 * The unified runtime form of a command that can be registered with Discord.js.
 *
 * A `Registerable` always includes:
 * - `data`: The `SlashCommandBuilder` used to register the command with Discord.
 * - `execute`: The handler called when the command (or one of its subcommands)
 *   is invoked at runtime.
 *
 */
export type Registerable =
  | (RegisterableCommand & RegularCommand)
  | (RegisterableCommand & CommandWithSubcommands);

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
export type Subcommand = {
  name: string;
  description: string;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>;
  customize?: (
    sub: SlashCommandSubcommandBuilder,
  ) => SlashCommandSubcommandBuilder;
  permissionLevel: PermissionLevel;
  guildOnly: boolean;
};

export type PermissionLevel =
  | 'admin'
  | 'owner'
  | 'disabled'
  | 'user'
  | null
  | undefined
  | bigint
  | number
  | (keyof typeof PermissionFlagsBits)[];

export type AllowedChannelTypeChannelOption =
  | ChannelType.GuildText
  | ChannelType.GuildVoice
  | ChannelType.GuildCategory
  | ChannelType.GuildAnnouncement
  | ChannelType.AnnouncementThread
  | ChannelType.PublicThread
  | ChannelType.PrivateThread
  | ChannelType.GuildStageVoice
  | ChannelType.GuildForum
  | ChannelType.GuildMedia;
