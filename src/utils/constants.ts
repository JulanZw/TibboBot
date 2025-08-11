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
