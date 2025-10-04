import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  SlashCommandSubcommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  ModalSubmitInteraction,
  TextInputStyle,
} from 'discord.js';

export type BotAction =
  | { type: 'skip'; answer: string }
  | { type: 'funny'; answer: string }
  | { type: 'correct' };

export type BotChannel = 'count' | 'today-is' | 'birthday';

export type ButtonType = 'prev' | 'next' | 'edit' | 'delete';

export type LogLevel = 'info' | 'warn' | 'error';

export type PaginationButtonLocation = 'embrace' | 'start' | 'end';

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

/**
 * Represents the result of a cooldown check for a command.
 *
 * @property allowed - Indicates if the user is permitted to execute the command at this time.
 * @property remaining - If not allowed, specifies the remaining cooldown time in milliseconds before the command can be used again.
 */
export interface CooldownResult {
  /**
   * Whether the user is allowed to run the command right now.
   */
  allowed: boolean;
  /**
   * If not allowed, the time (in ms) until the user can use the command again.
   */
  remaining?: number;
}

/**
 * Represents a single input field within a Discord modal.
 *
 * @property name - The label text shown above the input field.
 * @property style - The type of input to display (single-line or multi-line).
 * @property customId - Unique identifier for this field within the modal.
 * @property placeholder - Optional placeholder text shown when the field is empty.
 * @property required - Whether this field is required to be filled out (defaults to true).
 * @property minLength - Minimum number of characters the input must contain.
 * @property maxLength - Maximum number of characters the input can contain.
 * @property value - Pre-filled value shown in the input field when the modal opens.
 */
export type ModalField = {
  /**
   * The label text shown above the input field.
   */
  name: string;
  /**
   * The type of input to display.
   * Use {@link TextInputStyle.Short} for a single-line field
   * or {@link TextInputStyle.Paragraph} for a multi-line field.
   */
  style: TextInputStyle;
  /**
   * Unique identifier for this field within the modal.
   * Used to retrieve the value in the `onSubmit` handler.
   */
  customId: string;
  /**
   * Optional placeholder text shown when the field is empty.
   */
  placeholder?: string;
  /**
   * Whether this field is required to be filled out.
   * Defaults to `true`.
   */
  required?: boolean;
  /**
   * Minimum number of characters the input must contain.
   */
  minLength?: number;
  /**
   * Maximum number of characters the input can contain.
   */
  maxLength?: number;
  /**
   * Pre-filled value shown in the input field when the modal opens.
   */
  value?: string;
};

/**
 * Represents a Discord modal dialog configuration.
 *
 * @property id - The custom ID of the modal, used to match submissions.
 * @property dynamicIdUsage - Indicates whether this modal uses dynamic IDs.
 * @property title - The title displayed at the top of the modal window.
 * @property fields - The input `ModalField`'s displayed within the modal.
 * @property onSubmit - Handler function called when the modal is submitted.
 */
export type Modal = {
  /**
   * The custom ID of the modal, used to match submissions.
   * If {@link dynamicIdUsage} is `true`, this is treated as a base ID
   * and may be suffixed with dynamic values (e.g. `editReminderModal:123`).
   */
  id: string;
  /**
   * Indicates whether this modal is **ephemeral** — meaning it’s tied to specific
   * context or data from its creation (e.g. a user, reminder ID, or other state).
   *
   * When `true`, the modal entry is automatically removed from the registry after
   * submission to prevent reuse or context leakage. This is typically used for
   * one-shot modals whose handlers depend on creation-time data.
   */
  ephemeral: boolean;
  /**
   * The title displayed at the top of the modal window.
   */
  title: string;
  /**
   * The input fields displayed within the modal.
   */
  fields: ModalField[];
  /**
   * Handler function called when the modal is submitted.
   * Provides the `ModalSubmitInteraction` to access input values
   * and reply to the user.
   */
  onSubmit: (interaction: ModalSubmitInteraction) => Promise<any>;
};
