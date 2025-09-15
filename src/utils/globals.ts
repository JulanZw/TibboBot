import { PrismaClient } from '@prisma/client';
import { ChatInputCommandInteraction } from 'discord.js';
import { ScheduledTask } from 'node-cron';

/**
 * Standard color for embeds
 */
export const STANDARD_COLOR = '#3F48CC';

/**
 * Constant for the max amount of commands per embed page
 */
export const COMMANDS_PER_PAGE = 5;

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
 * All scheduled reminders
 */
export const scheduledReminderJobs = new Map<string, ScheduledTask>();

/**
 * The token required to login
 */
export const token = process.env.DISCORD_TOKEN;

/**
 * The discord id of the bot owner used in the magic command
 */
export const ownerId = process.env.OWNER_DISCORD_ID;

/**
 * The prisma client used for database functions
 */
export const prisma = new PrismaClient();

/**
 * Tracks who sent the "Today is" message in each guild today.
 * Key: guildId, Value: 'bot' | 'human' | null
 * Resets at midnight every day.
 */
export const todayWinners: Record<string, 'bot' | 'human' | null> = {};

export enum COOLDOWN_TIMES_MILISECONDS {
  MINUTE = 60000,
  TEN_MINUTES = 600000,
  HOUR = 6000000,
  DAY = 14400000,
}
