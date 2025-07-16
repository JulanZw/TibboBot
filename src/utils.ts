import { ChatInputCommandInteraction, Client, PartialGroupDMChannel, SlashCommandBuilder } from 'discord.js';

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
    description,
    execute
  };
}
