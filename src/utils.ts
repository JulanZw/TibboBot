import { ChatInputCommandInteraction, Client, Message, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { addGuild, getGuild, getUserData, insertUserData, updateUserCharMsgCount } from './database';
import { Command } from './commands';

export function logWithTime(message: string): void {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format as YYYY-MM-DD HH:MM:SS
  console.log(`[${timestamp}] ${message}`);
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

export type PermissionLevel = "user" | "admin" | "owner";

function getPermissionsForLevel(level: PermissionLevel): bigint | null {
  switch (level) {
    case "admin":
      return PermissionFlagsBits.Administrator;
    case "owner":
      return BigInt(0); // disable the command by default
    default:
      return null;
  }
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
 * @param adminOnly - Whether this command is restricted to admins only (used for internal checks). Default false.
 * @param guildOnly - Whether this command can only be used in a server (used for internal checks). Default false.
 * @param customize - Optional callback to customize the SlashCommandBuilder with additional options.
 *
 * @returns {Command} The constructed command object.
 */
export function commandBuilder(
  name: string,
  description: string,
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<any> | any,
  guildOnly,
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
      safeExecute(interaction, () => execute(interaction, client)),
  };
}

async function safeExecute(
  interaction: ChatInputCommandInteraction,
  fn: () => Promise<any> | any
) {
  try {
    await fn();
  } catch (err) {
    console.error(err);
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

// * Move this to database.ts?
export async function updateCounts(message: Message){
  const userId = message.author.id;
	const messageLength = message.content.length;

  const user = await getUserData(userId);
  if (user) {
    const newCharCount = user.char_count + BigInt(messageLength);
    const newMsgCount = user.msg_count + 1;
    await updateUserCharMsgCount(userId, newCharCount, newMsgCount);
    logWithTime(`Updated user messages and characters for ${message.author.id} [${message.author.username}]`);
  } else {
    await insertUserData(userId, BigInt(messageLength), 1);
    logWithTime(`Added new user for counting messages and characters for ${message.author.id} [${message.author.username}]`);
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
