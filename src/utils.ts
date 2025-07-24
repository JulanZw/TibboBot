import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, ChatInputCommandInteraction, Client, EmbedBuilder, ModalSubmitInteraction, PermissionFlagsBits, PermissionsBitField, SlashCommandBuilder } from 'discord.js';
import { addGuild, getGuild } from './database';
import { Command } from './commands';
import path from 'path';
import fs from "fs";
import { Reminders } from '@prisma/client';

//#region General

/**
 * Utility function so replies dont fail
 * 
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param ephemeral - If its ephemeral or not
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
 */
export async function safeReply(
  interaction: ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction,
  content: string,
  ephemeral: boolean = false,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[]
) {
  const payload: any = {
    ...(content ? { content } : {}),
    ephemeral,
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  if (!interaction.replied && !interaction.deferred) {
    return await interaction.reply(payload);
  } else {
    return await interaction.followUp(payload);
  }
}

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


//#endregion

//#region Logging

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

// ? Check if this can be fixed in the future
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

//#endregion

//#region Permissions

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

//#endregion

//#region Command Builder

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
 * @returns The constructed `Command` object.
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
      await safeReply(interaction, "An unexpected error occurred.");
    }
  }
}

//#endregion

//#region Formatting

/**
 * Util function for formatting a `Date` like 2000-01-01 into January 1st
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

//#endregion

//#region Reaction Messages

/**
 * *In-memory storage for the role react message building proces*
 */
export const pendingReactionRoleSetups = new Map <string, {
  interaction: ChatInputCommandInteraction,
  emojiRoleMap: Record<string, string>,
  channelId: string,
  targetChannelId: string
} >();

//#endregion

//#region Reminder

/**
 * Parses a `string` input into a `Date` object, supporting multiple date and duration formats.
 *
 * ### Supported input formats include:
 * #### Absolute dates:
 *   - ISO format: YYYY-MM-DD (e.g., "2025-07-24")
 *   - European format: DD-MM-YYYY (e.g., "24-07-2025")
 * #### Natural language keywords (English and Dutch):
 *   - "tomorrow", "the day after tomorrow"
 *   - "morgen", "overmorgen"
 *   - "next week", "volgende week", "over een week"
 *   - "next month", "volgende maand", "over een maand"
 * #### Weekday references (English and Dutch), optionally preceded by "next" or "volgende", e.g.:
 *   - "next monday", "volgende dinsdag", "volgende week vrijdag"
 * #### Relative durations specified with "in" or "over" (English/Dutch), supporting combinations of:
 *   - minutes ("minutes", "minuten", "min", "minuut")
 *   - hours ("hours", "uren", "u", "uur")
 *   - days ("days", "dagen", "dag")
 *   - weeks ("weeks", "weken")
 *   - months ("months", "maanden", "maand")
 *   - Supports fractional values for months (e.g., "in 1.5 months")
 *   - Multiple units can be combined in any order, but no duplicate units allowed
 *
 * ### Examples of valid inputs:
 * - "2025-07-24"
 * - "24-07-2025"
 * - "tomorrow"
 * - "overmorgen"
 * - "next monday"
 * - "volgende week vrijdag"
 * - "in 5 minutes"
 * - "in 2 days and 3 hours"
 * - "over 1 maand en 15 dagen"
 * - "in 1.5 months"
 *
 * @param {string} input - The input string to parse
 * @returns {Date | null} The parsed `Date` object if valid, or `null` if input is invalid or not recognized
 */
export function parseDurationOrDateString(input: string): Date | null {
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

  // Weekdays - (EN + NL)
  const weekdayMatch = input.match(/^(next|volgende(?:\s+week)?)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)$/i);
  if (weekdayMatch) {
    return parseWeekDay(weekdayMatch);
  }

  // Relative duration time (in/over x unit[s])
  const durationMatch = input.match(/\b(?:in|over)\s+((?:\d+\s*(?:min(?:uut)?(?:en)?|u(?:ren)?|hours?|dagen?|days?|weken?|weeks?|maanden?|months?)\s*(?:en|and)?\s*)+)/i);
  if (durationMatch) {
    return parseRelativeTime(durationMatch);
  }

  return null;
}

function parseWeekDay(match: RegExpMatchArray): Date | null {
  const targetDayStr = match[2];
  const targetDay = weekdayMap[targetDayStr];
  if (targetDay === undefined) return null;

  const now = new Date();
  const currentDay = now.getDay();
  let daysToAdd = (targetDay + 7 - currentDay) % 7;
  if (daysToAdd === 0) daysToAdd = 7; // always go to next, not today

  return addDays(daysToAdd);
}

function parseRelativeTime(match: RegExpMatchArray): Date | null {
  if (!match[1]) return null;
  const result = new Date();
  const seen = new Set<string>();

  const components = [...match[1].matchAll(/(\d+(?:\.\d+)?)\s*(days?|dagen|hours?|uren|u|minutes?|minuten|min|weeks?|weken|months?|maanden?|maand|uur|minuut)/gi)];

  if (components.length === 0) return null;

  let totalWholeMonths = 0;
  let extraDaysFromFractionalMonths = 0;
  let totalMs = 0;

  for (const [, numStr, rawUnit] of components) {
    const unit = rawUnit.toLowerCase();
    const value = parseFloat(numStr);
    if (isNaN(value)) return null;

    let normalized: 'minute' | 'hour' | 'day' | 'week' | 'month' | null = null;

    if (["minute", "minutes", "minuten", "min", "minuut"].includes(unit)) normalized = "minute";
    else if (["hour", "hours", "uren", "u", "uur"].includes(unit)) normalized = "hour";
    else if (["day", "days", "dagen", "dag"].includes(unit)) normalized = "day";
    else if (["week", "weeks", "weken"].includes(unit)) normalized = "week";
    else if (["month", "months", "maanden", "maand"].includes(unit)) normalized = "month";

    if (!normalized || seen.has(normalized)) return null;
    seen.add(normalized);

    switch (normalized) {
      case "minute":
        totalMs += value * 60 * 1000;
        break;
      case "hour":
        totalMs += value * 60 * 60 * 1000;
        break;
      case "day":
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case "week":
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
      case "month":
        const wholeMonths = Math.floor(value);
        const fractional = value - wholeMonths;

        totalWholeMonths += wholeMonths;

        if (fractional > 0) {
          const tempDate = new Date(result);
          tempDate.setMonth(tempDate.getMonth() + totalWholeMonths);

          const daysInThatMonth = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).getDate();
          extraDaysFromFractionalMonths += fractional * daysInThatMonth;
        }
        break;
    }
  }

  result.setTime(result.getTime() + totalMs);

  if (totalWholeMonths > 0) {
    result.setMonth(result.getMonth() + totalWholeMonths);
  }

  if (extraDaysFromFractionalMonths > 0) {
    result.setDate(result.getDate() + extraDaysFromFractionalMonths);
  }

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

export function createReminderEmbed(reminder: Reminders, index: number, total: number) {
  return new EmbedBuilder()
    .setTitle(`Reminder ${index + 1} of ${total}`)
    .addFields(
      { name: 'Message', value: reminder.message },
      { name: 'Remind At', value: `<t:${Math.floor(reminder.remindAt.getTime() / 1000)}:F>` },
    )
    .setFooter({ text: `Created: ${reminder.createdAt.toISOString()}` });
}

export function createReminderButtons(index: number, total: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === total - 1),
    new ButtonBuilder()
      .setCustomId(`edit`)
      .setLabel('Edit')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('delete')
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger),
  );
}

export interface ReminderCacheEntry {
  userId: string;
  message: string;
  remindAt: Date;
  id: string;
}

//#endregion

//#region Cache and Mem Storage

/**
 * Cache for reminders by date string (YYYY-MM-DD)
 */
export const reminderDaysCache = new Map<string, ReminderCacheEntry[]>()

/**
 * In memory storage for the active pages
 */
export const activePages = new Map<string, number>();

/**
 * In memory storage for tracking who requested the source files today
 */
export const sourceRequestTracker = new Set<string>();

/**
 * Utility function to get the key for the reminder cache
 * 
 * @param date - the date you want the key of
 * @returns the key of the provided date
 */
export function getDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

//#endregion
