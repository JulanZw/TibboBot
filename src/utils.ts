import path from 'path';
import fs from 'fs';

import {
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  Client,
  ColorResolvable,
  EmbedBuilder,
  InteractionReplyOptions,
  MessageFlags,
  ModalSubmitInteraction,
  PermissionFlagsBits,
  PermissionsBitField,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  StringSelectMenuInteraction,
} from 'discord.js';

import { Command, Subcommand } from './commands';

//#region General

export const STANDARD_COLOR = '#3F48CC';
export const COMMANDS_PER_PAGE = 5;
export const CUSTOM_ID_SPLITTER = '_';

/**
 * Utility function so replies don't fail
 *
 * @param interaction - The interaction that should be replied to
 * @param content - The content of the reply
 * @param ephemeral - If it's ephemeral or not
 * @param embeds - Embeds that should be replied with
 * @param components - Components that should be replied with
 */
export async function safeReply(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction
    | ModalSubmitInteraction
    | ChannelSelectMenuInteraction
    | StringSelectMenuInteraction,
  content: string,
  ephemeral: boolean = false,
  embeds?: EmbedBuilder[],
  components?: ActionRowBuilder<any>[],
) {
  const payload: InteractionReplyOptions = {
    ...(content ? { content } : {}),
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
    ...(embeds ? { embeds } : {}),
    ...(components ? { components } : {}),
  };

  if (!interaction.replied && !interaction.deferred) {
    return await interaction.reply(payload);
  } else {
    return await interaction.followUp(payload);
  }
}

//#endregion

//#region Logging

const logDir = path.resolve(__dirname, '../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFilePath = path.join(logDir, 'latest.log');

type LogLevel = 'info' | 'warn' | 'error';

/**
 * Logs a message with a timestamp and level to the log file.
 *
 * @param message - The message to log
 * @param level - The level of the log (info, warn, error)
 * @param logToConsole - If it should also be logged to the console or not, default false
 */
export function logWithTime(
  message: string,
  level: LogLevel = 'info',
  logToConsole: boolean = false,
): void {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format: YYYY-MM-DD HH:MM:SS
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

  fs.appendFileSync(logFilePath, logMessage, 'utf8');

  if (logToConsole) {
    const colorMap = {
      info: '\x1b[36m', // Cyan
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    };
    const reset = '\x1b[0m';

    console.log(`${colorMap[level]}${logMessage.trim()}${reset}`);
  }
}

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
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<any>,
  guildOnly: boolean,
  permissionLevel: PermissionLevel,
  customize: (builder: SlashCommandBuilder) => SlashCommandBuilder = (b) => b,
  subcommands?: Map<string,Subcommand>
): Command {
  const builder = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDefaultMemberPermissions(getPermissionsForLevel(permissionLevel));

  if (subcommands && subcommands.size > 0) {
    for (const [name, sub] of subcommands) {
      builder.addSubcommand((sc) =>
        (sub.customize ?? ((b) => b))(
          sc.setName(name).setDescription(sub.description),
        ),
      );
    }
  } else {
    customize(builder);
  }

  return {
    data: builder,
    name,
    description,
    permissionLevel,
    guildOnly,
    execute: async (interaction: ChatInputCommandInteraction, client: Client) =>
      safeExecute(name, interaction, async () => {
        const subcommandName = interaction.options.getSubcommand(false);

        if (subcommandName && subcommands) {
          const sub = subcommands.get(subcommandName);
          if (sub) {
            return await sub.execute(interaction, client);
          } else {
            return await interaction.reply({
              content: `Unknown subcommand: ${subcommandName}`,
              ephemeral: true,
            });
          }
        }

        return await execute(interaction, client);
      }),
    subcommands
  };
}

async function safeExecute(
  commandName: string,
  interaction: ChatInputCommandInteraction,
  fn: () => Promise<any>,
) {
  try {
    await fn();
    logWithTime(`${commandName} command executed`, 'info');
  } catch (err: any) {
    logWithTime('An Error occured' + err, 'error', true);
    return await safeReply(interaction, 'An unexpected error occurred.');
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
  return (
    date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
    daySuffix
  );
}

/**
 * Util function to get the suffix of a number, e.g. 1st, 2nd, 3rd, 4th, etc.
 *
 * @param number - the number you want the suffix of
 * @returns the suffix of the number
 */
export function getDaySuffix(number: number) {
  if (number > 3 && number < 21) return 'th';
  switch (number % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Util function to format a date into a string with the DD-MM-YYYY format
 *
 * @param date - The date to format
 * @returns A formatted string in the format DD-MM-YYYY
 */
export function formatDateToDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}

//#endregion

//#region Parsers and Preprocessors

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
  let returnDate: Date | null = null;

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const altMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  // YYYY-MM-DD
  if (isoMatch) returnDate = parseAbsoluteIsoDate(isoMatch);

  // DD-MM-YYYY
  if (altMatch) returnDate = parseAbsoluteAltDate(altMatch);

  // Natural keywords - (EN + NL)
  if (keywordMap[input]) return keywordMap[input]();

  // Weekdays - (EN + NL)
  const weekdayMatch = input.match(
    /^(next|volgende(?:\s+week)?)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)$/i,
  );
  if (weekdayMatch) {
    returnDate = parseWeekDay(weekdayMatch);
  }

  // Relative duration time
  const durationMatch = input.match(
    /\b(?:in|over)\s+((?:\d+\s*(?:min(?:uut)?(?:en)?|u(?:ren)?|hours?|dagen?|days?|weken?|weeks?|maanden?|months?)\s*(?:en|and)?\s*)+)/i,
  );
  if (durationMatch) {
    returnDate = parseRelativeTime(durationMatch);
  }

  if (returnDate) {
    returnDate.setSeconds(0);
    returnDate.setMilliseconds(0);
  }

  return returnDate;
}

function parseAbsoluteIsoDate(match: RegExpMatchArray): Date | null {
  const [, y, m, d] = match;
  return new Date(`${y}-${m}-${d}T00:00:00`);
}

function parseAbsoluteAltDate(match: RegExpMatchArray): Date | null {
  const [, d, m, y] = match;
  return new Date(`${y}-${m}-${d}T00:00:00`);
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

  const components = [
    ...match[1].matchAll(
      /(\d+(?:\.\d+)?)\s*(days?|dagen|hours?|uren|u|minutes?|minuten|min|weeks?|weken|months?|maanden?|maand|uur|minuut)/gi,
    ),
  ];

  if (components.length === 0) return null;

  let totalWholeMonths = 0;
  let extraDaysFromFractionalMonths = 0;
  let totalMs = 0;

  for (const [, numStr, rawUnit] of components) {
    const unit = rawUnit.toLowerCase();
    const value = parseFloat(numStr);
    if (isNaN(value)) return null;

    let normalized: 'minute' | 'hour' | 'day' | 'week' | 'month' | null = null;

    if (['minute', 'minutes', 'minuten', 'min', 'minuut'].includes(unit))
      normalized = 'minute';
    else if (['hour', 'hours', 'uren', 'u', 'uur'].includes(unit))
      normalized = 'hour';
    else if (['day', 'days', 'dagen', 'dag'].includes(unit)) normalized = 'day';
    else if (['week', 'weeks', 'weken'].includes(unit)) normalized = 'week';
    else if (['month', 'months', 'maanden', 'maand'].includes(unit))
      normalized = 'month';

    if (!normalized || seen.has(normalized)) return null;
    seen.add(normalized);

    switch (normalized) {
      case 'minute':
        totalMs += value * 60 * 1000;
        break;
      case 'hour':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'day':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'week':
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month': {
        const wholeMonths = Math.floor(value);
        const fractional = value - wholeMonths;

        totalWholeMonths += wholeMonths;

        if (fractional > 0) {
          const tempDate = new Date(result);
          tempDate.setMonth(tempDate.getMonth() + totalWholeMonths);

          const daysInThatMonth = new Date(
            tempDate.getFullYear(),
            tempDate.getMonth() + 1,
            0,
          ).getDate();
          extraDaysFromFractionalMonths += fractional * daysInThatMonth;
        }
        break;
      }
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

// Small functions and consts for 'parseDurationOrDateString()'
const weekdayMap: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  zondag: 0,
  maandag: 1,
  dinsdag: 2,
  woensdag: 3,
  donderdag: 4,
  vrijdag: 5,
  zaterdag: 6,
};

const keywordMap: Record<string, () => Date> = {
  tomorrow: () => addDays(1),
  morgen: () => addDays(1),
  'the day after tomorrow': () => addDays(2),
  overmorgen: () => addDays(2),
  'next week': () => addDays(7),
  'volgende week': () => addDays(7),
  'over een week': () => addDays(7),
  'next month': () => addMonths(1),
  'volgende maand': () => addMonths(1),
  'over een maand': () => addMonths(1),
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

/**
 * Preprocesses a numeric expression string to normalize localized number formats
 * and convert alternative mathematical notations into a form compatible with math.js.
 *
 * This function performs:
 * - Localization handling (Dutch and English styles):
 *   - Converts comma decimals (e.g., "5,5") to dot decimals ("5.5")
 *   - Removes thousand separators (e.g., "1.000,50" → "1000.50")
 * - Base conversion:
 *   - Converts binary (0b), octal (0o), and hexadecimal (0x) to decimal
 * - Symbol replacements:
 *   - Handles alternative multiplication (×, ✕), division (÷), minus (−, –, etc.), and plus (＋) signs
 * - Removes spaces in numbers (e.g., "1 000" → "1000")
 * - Converts full-width brackets and parentheses to ASCII equivalents
 * - Handles repeated operators (e.g., "--" becomes "+", "++" becomes "+")
 *
 * @param expr - The input expression string to preprocess (e.g., "0b101 + 5,4 + 1.000,25 × 2")
 * @returns The normalized and math.js-compatible string (e.g., "5 + 5.4 + 1000.25 * 2")
 */
export function preprocessNumerics(expr: string): string {
  // Normalize localized number formats (Dutch vs English)
  const normalized = expr.replace(/(\d[\d.,]*\d|\d)/g, (match) => {
    const hasDot = match.includes('.');
    const hasComma = match.includes(',');

    if (hasDot && hasComma) {
      // e.g., 1.000,50 (Dutch) or 1,000.50 (English)
      if (match.indexOf(',') > match.indexOf('.')) {
        // Dutch: dot as thousand, comma as decimal
        return match.replace(/\.(?=\d{3})/g, '').replace(',', '.');
      } else {
        // English: comma as thousand, dot as decimal
        return match.replace(/,(?=\d{3})/g, '');
      }
    } else if (hasComma) {
      const parts = match.split(',');
      if (parts.length === 2 && parts[1].length <= 2) {
        // Likely Dutch decimal
        return match.replace(',', '.');
      } else {
        // English thousands comma
        return match.replace(/,(?=\d{3})/g, '');
      }
    } else if (hasDot) {
      const parts = match.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        return match; // English decimal
      } else {
        // Dot as thousands separator
        return match.replace(/\.(?=\d{3})/g, '');
      }
    }

    return match;
  });

  // Additional numeric and symbol normalization
  return normalized
    .replace(/\b0([box])[0-9a-fA-F]+\b/g, (match) => {
      const prefix = match.slice(0, 2);
      let base: number;
      switch (prefix) {
        case '0b':
          base = 2;
          break;
        case '0o':
          base = 8;
          break;
        case '0x':
          base = 16;
          break;
        default:
          return match;
      }
      return parseInt(match.slice(2), base).toString();
    }) // Binary, octal, hex
    .replace(/[×✕]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−﹣‒–—―]/g, '-')
    .replace(/[＋]/g, '+')
    .replace(/(?<=\d)[\s\u00A0](?=\d)/g, '') // Spaces in numbers
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')')
    .replace(/[［]/g, '[')
    .replace(/[］]/g, ']')
    .replace(/[｛]/g, '{')
    .replace(/[｝]/g, '}')
    .replace(/\+\++/g, '+')
    .replace(/--+/g, '+') // Double minus becomes plus
    .trim();
}

//#endregion

//#region Embeds and Buttons

/**
 * Util function for building an embed
 *
 * @param title - The title of the embed
 * @param fields - The fields of the embed
 * @param description - The description of the embed, optional
 * @param footer - The footer of the embed, optional
 * @param timestamp - If the embed should have a timestamp, defaults to false
 * @param color - The color of the embed, defaults to STANDARD_COLOR
 * @param customize - A function to customize the embed further, defaults to no customization
 *
 * @returns An EmbedBuilder instance with the specified properties
 */
export function embedBuilder({
  title,
  fields,
  description,
  footer,
  timestamp = false,
  color = STANDARD_COLOR,
  customize = (e) => e,
}: {
  title: string;
  fields?: APIEmbedField[];
  description?: string;
  footer?: string;
  timestamp?: boolean;
  color?: ColorResolvable;
  customize?: (embed: EmbedBuilder) => EmbedBuilder;
}): EmbedBuilder {
  let embed = new EmbedBuilder().setTitle(title).setColor(color);

  if (fields && fields.length > 0) embed = embed.setFields(fields);
  if (description) embed = embed.setDescription(description);
  if (footer) embed = embed.setFooter({ text: footer });
  if (timestamp) embed = embed.setTimestamp();

  return customize(embed);
}

type ButtonType = 'prev' | 'next' | 'edit' | 'delete';

/**
 * Creates a single button based on its type and config.
 *
 * @param type - The `ButtonType` of the button (prev, next, edit, delete)
 * @param actionId - The base action ID for the button
 * @param disabled - Whether the button should be disabled, defaults to false
 * @param label - Optional label for the button, defaults to type-based label
 *
 * @return A ButtonBuilder instance configured with the specified properties
 */
function createButton({
  type,
  disabled = false,
  label,
  style,
  customId,
}: {
  type: ButtonType;
  disabled?: boolean;
  label?: string;
  style?: ButtonStyle;
  customId?: string;
}): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId ?? `${type}`)
    .setDisabled(disabled);

  switch (type) {
    case 'prev':
      return button
        .setLabel(label ?? 'Previous')
        .setStyle(ButtonStyle.Secondary);
    case 'next':
      return button.setLabel(label ?? 'Next').setStyle(ButtonStyle.Secondary);
    case 'edit':
      return button.setLabel(label ?? 'Edit').setStyle(ButtonStyle.Primary);
    case 'delete':
      return button.setLabel(label ?? 'Delete').setStyle(ButtonStyle.Danger);
    default:
      return button
        .setLabel(label ?? 'Unknown')
        .setStyle(style ?? ButtonStyle.Secondary);
  }
}

/**
 * Creates one action row of standard buttons with optional auto-disable logic.
 *
 * @param actionId - The base action ID for the buttons
 * @param index - The current index of the item being paginated
 * @param total - The total number of pages
 * @param types - The types of buttons to include, defaults to all
 *
 * @returns An ActionRowBuilder containing the buttons
 */
export function createButtonsRow(
  index: number,
  total: number,
  types: ButtonType[] = ['prev', 'edit', 'delete', 'next'],
): ActionRowBuilder<ButtonBuilder> {
  const buttons = types.map((type) =>
    createButton({
      type,
      disabled:
        (type === 'prev' && index === 0) ||
        (type === 'next' && index === total - 1),
    }),
  );

  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
}

export interface ReminderCacheEntry {
  userId: string;
  message: string;
  remindAt: Date;
  id: string;
}

//#endregion

//#region Birthday

export function parseBirthdayDate(input: string): Date | null {
  let returnDate: Date | null = null;

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const altMatch = input.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  // YYYY-MM-DD
  if (isoMatch) returnDate = parseAbsoluteIsoDate(isoMatch);

  // DD-MM-YYYY
  if (altMatch) returnDate = parseAbsoluteAltDate(altMatch);

  if (returnDate) {
    returnDate.setSeconds(0);
    returnDate.setMilliseconds(0);
  }

  return returnDate;
}

//#endregion

//#region Cache and Mem Storage

/**
 * Cache for reminders by date string (YYYY-MM-DD)
 */
export const reminderDaysCache = new Map<string, ReminderCacheEntry[]>();

/**
 * In memory storage for tracking who requested the source files today
 */
export const sourceRequestTracker = new Set<string>();

/**
 * In-memory storage for the role react message building proces
 */
export const pendingReactionRoleSetups = new Map<
  string,
  {
    interaction: ChatInputCommandInteraction;
    emojiRoleMap: Record<string, string>;
    channelId: string;
    targetChannelId: string;
    title: string;
    messageIds: string[];
  }
>();

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
