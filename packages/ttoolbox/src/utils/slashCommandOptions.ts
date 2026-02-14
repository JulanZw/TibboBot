import {
  ChannelType,
  SlashCommandBooleanOption,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from 'discord.js';

import { AllowedChannelTypeChannelOption } from '../types/channel.js';

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

export const booleanOption =
  (name: string, desc: string, required = true) =>
  (opt: SlashCommandBooleanOption) =>
    opt.setName(name).setDescription(desc).setRequired(required);
