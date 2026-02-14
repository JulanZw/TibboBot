import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';

import { PermissionLevel } from '../types/permission.js';

/**
 * Utility function to return the proper permission bits
 *
 * @param level - the PermissionLevel the bits need to be returned of. Can be an array
 * @returns the permission's bit value or null for unrestricted
 */
export function getPermissionsForLevel(level: PermissionLevel): bigint | null {
  if (level === 'admin') {
    return PermissionFlagsBits.Administrator;
  }

  if (level === 'owner' || level === 'disabled') {
    // disable the command by default
    return BigInt(0);
  }

  if (typeof level === 'bigint' || typeof level === 'number') {
    return BigInt(level);
  }

  if (Array.isArray(level)) {
    return new PermissionsBitField(level).bitfield;
  }
  // unrestricted
  return null;
}
