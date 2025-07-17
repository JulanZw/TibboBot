import { ChatInputCommandInteraction, Client, Interaction, Message, PartialGroupDMChannel, SlashCommandBuilder } from 'discord.js';
import { addGuild, getGuild, getUserData, insertUserData, updateUserCharMsgCount } from './database';

export function logWithTime(message: string): void {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format as YYYY-MM-DD HH:MM:SS
  console.log(`[${timestamp}] ${message}`);
}

export async function logToChannel(message: string, client: Client): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').slice(0, 19);
  
  try {
    const channel = await client.channels.fetch('1323669455426818139');
    if (channel?.isTextBased() && !(channel instanceof PartialGroupDMChannel)) {
      await channel.send(`[${timestamp}] ${message}`);
    } else {
      logWithTime("Channel not found or is not text-based");
    }
  } catch (error) {
    logWithTime(`Error fetching or sending message to channel: ${(error as Error).message}`);
  }
}

export function commandBuilder(
  name: string,
  description: string,
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<any> | any,
  customize?: (builder: SlashCommandBuilder) => SlashCommandBuilder
) {
  let builder = new SlashCommandBuilder()
    .setName(name)
    .setDescription(description);

  if (customize) {
    builder = customize(builder);
  }

  return {
    data: builder,
    name,
    execute
  };
}

export async function checkAdmin(interaction: ChatInputCommandInteraction){
  return interaction.memberPermissions?.has('Administrator');
}

export async function updateCounts(message){
  const userId = message.author.id;
	const messageLength = message.content.length;

  const row = await getUserData(userId);
  if (row) {
    const newCharCount = row.char_count + messageLength;
    const newMsgCount = row.msg_count + 1;
    await updateUserCharMsgCount(userId, newCharCount, newMsgCount);
    logWithTime(`Updated user messages and characters for ${message.author.id} [${message.author.username}]`);
  } else {
    await insertUserData(userId, messageLength, 1);
    logWithTime(`Added new user for counting messages and characters for ${message.author.id} [${message.author.username}]`);
  }
}

export async function ensureGuildExistance(messageOrInteraction: Interaction | Message ){
  const guildId = messageOrInteraction.guildId;

  if(!guildId) return;

  const guild = await getGuild(guildId);
  if(!guild){
    await addGuild(guildId);
  }
}
