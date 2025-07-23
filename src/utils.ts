import { ChatInputCommandInteraction, Client, PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { addGuild, getGuild } from './database';
import { Command } from './commands';
import path from 'path';
import fs from "fs";

const logFilePath = path.join("logs", "latest.log");

if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

type LogLevel = "info" | "warn" | "error";

/**
 * Logs a message with a timestamp and level to the log file.
 * 
 * @param message - The message to log
 * @param level - The level of the log (info, warn, error)
 * @param logToConsole - If it should also be logged to the console or not, default false
 */
export function logWithTime(message: string, level: LogLevel = 'info', logToConsole: boolean = false): void {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format: YYYY-MM-DD HH:MM:SS
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  fs.appendFileSync(logFilePath, logMessage, 'utf8');

  if(logToConsole){
    const colorMap = {
      info: '\x1b[36m',   // Cyan
      warn: '\x1b[33m',   // Yellow
      error: '\x1b[31m',  // Red
    };
    const reset = '\x1b[0m';

    console.log(`${colorMap[level]}${logMessage.trim()}${reset}`);
  }
}

// ! What to do with this
// export async function logToChannel(message: string, client: Client): Promise<void> {
//   const now = new Date();
//   const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
  
//   try {
//     const channel = await client.channels.fetch('1323669455426818139');
//     if (channel?.isTextBased() && !(channel instanceof PartialGroupDMChannel)) {
//       await channel.send(`[${timestamp}] ${message}`);
//     } else {
//       logWithTime("Channel not found or is not text-based");
//     }
//   } catch (error) {
//     logWithTime(`Error fetching or sending message to channel: ${(error as Error).message}`);
//   }
// }

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
    return BigInt(0); // disable the command by default
  }

  if (typeof level === 'bigint' || typeof level === 'number') {
    return BigInt(level);
  }

  if (Array.isArray(level)) {
    return new PermissionsBitField(level).bitfield;
  }

  return null; // unrestricted
}

/**
 * A utility function to easily create a Discord slash command.
 *
 * Supports optional customization of the command builder, and flags to mark
 * the command as admin-only or guild-only for internal logic.
 *
 * @param name - The name of the command (used in Discord).
 * @param description - A short description of the command.
 * @param execute - The function to execute when the command is run.
 * @param guildOnly - Whether this command can only be used in a server (used for internal checks).
 * @param permissionLevel - The permission level the user needs to have to use this command.
 * @param customize - Optional callback to customize the SlashCommandBuilder with additional options.
 *
 * @returns {Command} The constructed command object.
 */
export function commandBuilder(
  name: string,
  description: string,
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<any> | any,
  guildOnly: boolean,
  permissionLevel: PermissionLevel,
  customize: (builder: SlashCommandBuilder) => SlashCommandBuilder = b => b
): Command {
  const builder = customize(
    new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(getPermissionsForLevel(permissionLevel))
  );

  return {
    data: builder,
    name,
    description,
    permissionLevel,
    guildOnly,
    execute: async (interaction, client) =>
      safeExecute(name, interaction, () => execute(interaction, client)),
  };
}

async function safeExecute(
  commandName: string,
  interaction: ChatInputCommandInteraction,
  fn: () => Promise<any> | any
) {
  try {
    await fn();
    logWithTime(`${commandName} command executed`);
  } catch (err) {
    logWithTime('An Error occured'+err,'error');
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp("An unexpected error occurred.");
    } else {
      await interaction.reply("An unexpected error occurred.");
    }
  }
}

// ! This can go?
// export async function checkAdmin(interaction: Interaction){
//   return interaction.memberPermissions?.has('Administrator');
// }

/**
 * Util function to ensure a guild exists in the database. It checks if its in the database and if not it creates it.
 * 
 * @param messageOrInteraction - the interaction or message that will provide the ID
 * @returns the found or created guild
 */
export async function ensureGuildExistance(guildId: string ) {
  const guild = await getGuild(guildId);
  return guild ? guild : await addGuild(guildId);
}

/**
 * Util function for formatting a Date like 2000-01-01 into January 1st
 * 
 * @param date - the date that needs formatting
 * @returns the formatted date
 */
export function formatDate(date: Date) {
  const daySuffix = getDaySuffix(date.getDate());
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + daySuffix;
}

function getDaySuffix(day: number) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * In-memory storage for the role react message building proces
 */
export const pendingReactionRoleSetups = new Map <string, {
  interaction: ChatInputCommandInteraction,
  emojiRoleMap: Record<string, string>,
  channelId: string,
  targetChannelId: string
} >();

/**
 * Utility function that extracts a date from the following formats:
 * - YYYY-MM-DD
 * - DD-MM-YYYY
 * - in x minutes, hours, and/or days (any order, no duplicate units)
 * - natural keywords (EN & NL): "tomorrow", "the day after tomorrow", "next week", "next month", "morgen", "overmorgen", "volgende week", "volgende maand"
 * - Dutch: "over x minuut/dag/maand"
 * - EN/NL: "in/over x week(s)/month(s)", "next/volgende <weekday>"
 *
 * @param input - the input `string` from which the date is extracted
 * @returns the parsed `Date` object or `null` if the input is invalid
 */
export function parseDurationOrDate(input: string): Date | null {
  input = input.trim().toLowerCase();

  // Absolute: YYYY-MM-DD
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  // Absolute: DD-MM-YYYY
  const altMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (altMatch) {
    const [_, d, m, y] = altMatch;
    return new Date(`${y}-${m}-${d}T00:00:00`);
  }

  // Natural keywords - (EN + NL)
  if (keywordMap[input]) return keywordMap[input]();

  // "in/over x week(s)/month(s)" - (EN + NL)
  const durationMatch = input.match(/^(in|over)\s+(\d+)\s*(week|weeks|weken|month|months|maand|maanden)$/);
  if (durationMatch) {
    return parseDuration(durationMatch);
  }

  // "over x minuut/dag/maand" - (NL)
  const overMatch = input.match(/^over\s+(\d+)\s*(minuut|minuten|uur|uren|dag|dagen|maand|maanden)$/);
  if (overMatch) {
    return parseDutchOver(overMatch);
  }

  // Weekdays - (EN + NL)
  const weekdayMatch = input.match(/^(next|volgende)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)$/);
  if (weekdayMatch) {
    return parseWeekDay(weekdayMatch);
  }

  // Relative time (e.g. "in 2 dagen en 3 uren") - (EN + NL)
  const relativePattern = /^in\s+((?:\d+\s*(?:days?|dagen|hours?|uren|u|minutes?|minuten|min)\s*(?:and|en|,)?\s*)+)$/i;
  const relativeMatch = input.match(relativePattern);
  if (relativeMatch) {
    return parseRelativeTime(relativeMatch);
  }

  return null;
}

function parseDuration(match: RegExpMatchArray){
  const [, , numStr, unitRaw] = match;
  const value = parseInt(numStr, 10);
  if (isNaN(value)) return null;

  const result = new Date();
  const unit = unitRaw.toLowerCase();

  if (["week", "weeks", "weken"].includes(unit)) {
    result.setDate(result.getDate() + 7 * value);
  } else if (["month", "months", "maand", "maanden"].includes(unit)) {
    result.setMonth(result.getMonth() + value);
  } else {
    return null;
  }

  return result;
}

function parseDutchOver(match: RegExpMatchArray){
  const [, numStr, unitRaw] = match;
    const value = parseInt(numStr, 10);
    if (isNaN(value)) return null;

    const result = new Date();
    const unit = unitRaw.toLowerCase();

    if (["minuut", "minuten"].includes(unit)) {
      result.setMinutes(result.getMinutes() + value);
    } else if (["uur", "uren"].includes(unit)) {
      result.setHours(result.getHours() + value);
    } else if (["dag", "dagen"].includes(unit)) {
      result.setDate(result.getDate() + value);
    } else if (["maand", "maanden"].includes(unit)) {
      result.setMonth(result.getMonth() + value);
    } else {
      return null;
    }

    return result;
}

function parseWeekDay(match: RegExpMatchArray){
  const targetDayStr = match[2];
  const targetDay = weekdayMap[targetDayStr];
  if (targetDay === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  let daysToAdd = (targetDay + 7 - currentDay) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // always go to next, not today

  return addDays(daysToAdd);
}

function parseRelativeTime(match: RegExpMatchArray){
  const components = [...match[1].matchAll(/(\d+)\s*(days?|dagen|hours?|uren|u|minutes?|minuten|min)/g)];

  const seen = new Set<string>();
  let days = 0, hours = 0, minutes = 0;

  for (const [, num, rawUnit] of components) {
    const unit = rawUnit.toLowerCase();
    let normalized: 'day' | 'hour' | 'minute' | null = null;

    if (["day", "days", "dagen"].includes(unit)) normalized = 'day';
    else if (["hour", "hours", "uren", "u"].includes(unit)) normalized = 'hour';
    else if (["minute", "minutes", "minuten", "min"].includes(unit)) normalized = 'minute';

    if (!normalized || seen.has(normalized)) return null; // invalid or duplicate
    seen.add(normalized);

    const value = parseInt(num, 10);
    if (isNaN(value)) return null;

    if (normalized === 'day') days = value;
    else if (normalized === 'hour') hours = value;
    else if (normalized === 'minute') minutes = value;
  }

  const result = new Date();
  result.setMinutes(result.getMinutes() + minutes);
  result.setHours(result.getHours() + hours);
  result.setDate(result.getDate() + days);

  return result;
}

const weekdayMap: Record<string, number> = {
  "sunday": 0,
  "monday": 1,
  "tuesday": 2,
  "wednesday": 3,
  "thursday": 4,
  "friday": 5,
  "saturday": 6,
  "zondag": 0,
  "maandag": 1,
  "dinsdag": 2,
  "woensdag": 3,
  "donderdag": 4,
  "vrijdag": 5,
  "zaterdag": 6
};

const keywordMap: Record<string, () => Date> = {
  "tomorrow": () => addDays(1),
  "morgen": () => addDays(1),
  "the day after tomorrow": () => addDays(2),
  "overmorgen": () => addDays(2),
  "next week": () => addDays(7),
  "volgende week": () => addDays(7),
  "over een week": () => addDays(7),
  "next month": () => addMonths(1),
  "volgende maand": () => addMonths(1),
  "over een maand": () => addMonths(1),
};

function addDays(days: number): Date {
  const result = new Date();
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(months: number): Date {
  const result = new Date();
  result.setMonth(result.getMonth() + months);
  return result;
}


export interface ReminderCacheEntry {
  userId: string;
  message: string;
  remindAt: Date;
  id: string;
}

/**
 * Cache for reminders by date string (YYYY-MM-DD)
 */
export const reminderDaysCache = new Map<string, ReminderCacheEntry[]>

/**
 * Utility function to get the key for the reminder cache
 * 
 * @param date - the date you want the key of
 * @returns the key of the provided date
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

