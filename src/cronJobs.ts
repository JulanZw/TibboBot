import cron from 'node-cron';
import { Client, PartialGroupDMChannel, TextChannel } from 'discord.js';
import { formatDate, logWithTime } from './utils';
import {
  getAllBirthdaysInGuildForGivenDate,
  getAllGuilds,
} from './database';

export function setupCronJobs(client: Client): void {
  cron.schedule('0 0 * * *', async () => {
    try {
      let randomDelay = Math.floor(Math.random() * 3001); // 0–3000 ms

      await new Promise(resolve => setTimeout(resolve, randomDelay < 0 ? 1500 : randomDelay)); // the delay below 0 happend once so this is just in case

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

          const birthdays = await getAllBirthdaysInGuildForGivenDate(guild.guildId, new Date());

          await Promise.allSettled(birthdays.map(birthday =>
            channel.send(`🎉 Happy Birthday <@${birthday.userId}>!`)
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
