import cron from 'node-cron';
import { Client, PartialGroupDMChannel, TextChannel } from 'discord.js';
import { logWithTime } from './utils';
import {
  getAllBirthdaysInGuild,
  getAllGuilds,
} from './database';

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const daySuffix = getDaySuffix(date.getDate());
  return date.toLocaleDateString('en-US', options) + daySuffix;
}

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
  cron.schedule('0 0 * * *', async () => {
    try {
      let randomDelay = Math.floor(Math.random() * 3001); // 0–3000 ms

      if (randomDelay < 0) {
        randomDelay = 1500;
      }

      await new Promise(resolve => setTimeout(resolve, randomDelay));

      const guilds = await getAllGuilds();
      const formattedDate = formatDate(new Date());

      // Today-is messages
      await Promise.allSettled(guilds.map(async guild => {
        if (!guild.todayIsChannelId) return;

        try {
          const channel = await client.channels.fetch(guild.todayIsChannelId);
          if (!channel || !(channel instanceof TextChannel)) {
            logWithTime(`Channel for guild ${guild.guildId} not found or not text-based.`);
            return;
          }


          await channel.send(`Today is ${formattedDate}, waited for ${randomDelay} ms`);
          logWithTime(`Message sent in ${guild.guildId}: "Today is ${formattedDate}"`);
        } catch (err) {
          logWithTime(`Failed to send 'today is' message in guild ${guild.guildId}: ${err}`);
        }
      }));

      // Birthday messages
      await Promise.allSettled(guilds.map(async guild => {
        if (!guild.birthdayChannelId) return;

        try {
          const channel = await client.channels.fetch(guild.birthdayChannelId);
          if (!channel || !(channel instanceof TextChannel)) {
            logWithTime(`Birthday channel in guild ${guild.guildId} not found or not text-based.`);
            return;
          }

          const birthdays = await getAllBirthdaysInGuild(guild.guildId);

          await Promise.allSettled(birthdays.map(birthday =>
            channel.send(`🎉 Happy Birthday <@${birthday.user.discordId}>!`)
          ));
        } catch (err) {
          logWithTime(`Failed to send birthday messages in guild ${guild.guildId}: ${err}`);
        }
      }));

    } catch (error) {
      console.error("Error in daily cron job:", error);
    }
  });

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
