import {
  ChannelType,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from 'discord.js';

type AllowedChannelTypeChannelOption =
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

export const userOption =
  (name: string, desc: string, required = true) =>
  (opt: SlashCommandUserOption) =>
    opt.setName(name).setDescription(desc).setRequired(required);

export const integerOption =
  (name: string, desc: string, required = true) =>
  (opt: SlashCommandIntegerOption) =>
    opt.setName(name).setDescription(desc).setRequired(required);

export const stringOption =
  (name: string, desc: string, required = true) =>
  (opt: SlashCommandStringOption) =>
    opt.setName(name).setDescription(desc).setRequired(required);

export const channelOption =
  (
    name: string,
    desc: string,
    required = true,
    channelType:
      | AllowedChannelTypeChannelOption
      | AllowedChannelTypeChannelOption[] = [ChannelType.GuildText],
  ) =>
  (opt: SlashCommandChannelOption) =>
    opt
      .setName(name)
      .setDescription(desc)
      .setRequired(required)
      .addChannelTypes(
        ...(Array.isArray(channelType) ? channelType : [channelType]),
      );

export const roleOption =
  (name: string, desc: string, required = true) =>
  (opt: SlashCommandRoleOption) =>
    opt.setName(name).setDescription(desc).setRequired(required);
