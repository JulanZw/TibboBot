import { PermissionFlagsBits } from 'discord.js';

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
