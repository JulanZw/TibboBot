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

export type LogLevel = 'info' | 'warn' | 'error' | 'startup';

export interface Command {
  data: SlashCommandBuilder;
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  guildOnly: boolean;
  execute: (...args: any[]) => Promise<any>;
  subcommands?: Map<string, Subcommand>;
}

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
