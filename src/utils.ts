import { Client, PartialGroupDMChannel } from 'discord.js';

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
