import cron from 'node-cron';
import { Client, PartialGroupDMChannel, TextChannel } from 'discord.js';
import { logWithTime } from './utils';
import {
  getAllTodayIsChannels,
  getBirthday
  
} from './database';

// Function to send a message to the Discord channel with the current date
async function sendDailyMessage(sleepTime: number, client: Client): Promise<void> {
  const formattedDate = formatDate(new Date());
  const channels = await getAllTodayIsChannels()
  for(const channelId of channels){
    const channel = await client.channels.fetch(channelId);
    if (channel?.isTextBased() && !(channel instanceof PartialGroupDMChannel)) {
      await channel.send(`Today is ${formattedDate}, waited for ${sleepTime} ms`);
      logWithTime(`Message sent: "Today is ${formattedDate}"`);
    } else {
      logWithTime('Channel not found or not text-based.');
    }
  }
}

// Format the given date
function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const daySuffix = getDaySuffix(date.getDate());
  return date.toLocaleDateString('en-US', options) + daySuffix;
}

// Get suffix for the day (st, nd, rd, th)
function getDaySuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function setupCronJobs(client: Client): void {
  // Daily message job
  cron.schedule('0 0 * * *', async () => {
    try {
      const rawChannel = await client.channels.fetch('1065200345636155482');
      if (!rawChannel?.isTextBased()) {
        logWithTime("Error: Channel not found or not text-based.");
        return;
      }

      const channel = rawChannel as TextChannel;
      let randomDelay = Math.floor(Math.random() * 3001); // 0–3000 ms

      if(randomDelay<0){
        randomDelay=1500;
      }

      await new Promise(resolve => setTimeout(resolve, randomDelay));
      await sendDailyMessage(randomDelay, client);

      const birthdayUsers = await getBirthday(new Date());
      if (birthdayUsers && birthdayUsers.length > 0) {
        for (const user of birthdayUsers) {
          await channel.send(`🎉 Happy Birthday <@${user.discordId}>!`);
        }
      }
    } catch (error) {
      console.error("Error in daily cron job:", error);
    }
  });

  // New Year's message
  cron.schedule('0 0 1 1 *', async () => {
    try {
      const channel = await client.channels.fetch('1065200345636155482');
      if (channel?.isTextBased() && !(channel instanceof PartialGroupDMChannel)) {
        await channel.send(`🎆 Happy New Year!`);
      } else {
        logWithTime("Error: Channel not found or not text-based.");
      }
    } catch (error) {
      console.error("Error in yearly cron job:", error);
    }
  });
}
