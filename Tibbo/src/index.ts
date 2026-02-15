import {
  ActivityType,
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} from 'discord.js';
import { CommandManager } from '@julanzw/ttoolbox-discord-framework';

import { BotLogger } from './impl/BotLogger.class.ts';
import { setupCronJobs } from './cronJobs.ts';
import { getRemindersOfToday } from './database/reminders.ts';
import { scheduleReminder } from './utils/managers/reminderManager.ts';
import { BotDiscordHandler } from './impl/BotDiscordHandler.class.ts';
import { prisma, token, ownerId } from './utils/globals.ts';
import { registerCommands } from './commands.ts';

const scope = 'startup';

// #region Setup

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
});

export const logger = new BotLogger();
export const commandManager = new CommandManager().setLogger(logger);
registerCommands(commandManager);
const discordHandler = new BotDiscordHandler(client, logger, prisma);
discordHandler.setupErrorHandlers();
await discordHandler.setupOtherHandlers();

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.once('clientReady', async (readyClient) => {
  setupCronJobs(readyClient);

  if (!token || !process.env.DATABASE_URL) {
    logger.error('Token or database url not set.', scope, true);
    process.exit(1);
  }

  if (!ownerId || !process.env.WOL_IP || !process.env.WOL_MAC) {
    logger.warn('Owner id, WOL IP or WOL MAC not set', scope, true);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    const commands = commandManager.toDiscordJSON();
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commands,
    });
    logger.info(`${commands.length} Slash commands registered.`, scope);

    if (process.env.ENV !== 'dev') {
      readyClient.user.setStatus('online');
      readyClient.user.setActivity('commands', {
        type: ActivityType.Listening,
      });
      try {
        const todaysReminders = await getRemindersOfToday();

        for (const reminder of todaysReminders) {
          const user = await readyClient.users.fetch(reminder.userId);
          scheduleReminder(user, reminder);
        }

        logger.info(
          `Scheduled ${todaysReminders.length} reminders for today.`,
          scope,
        );
      } catch (err: any) {
        logger.error(
          `Failed to schedule today's reminders: ${err}`,
          scope,
          true,
        );
      }
    } else {
      readyClient.user.setStatus('dnd');
      readyClient.user.setActivity('Being tested', {
        type: ActivityType.Custom,
        state: 'Being tested',
      });
    }
  } catch (err: any) {
    logger.error('Error registering slash commands: ' + err, scope, true);
  }
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() =>
    logger.info(
      `Logged in as ${client.user ? `${client.user.username}#${client.user.discriminator}` : 'ERROR'}`,
      'info',
      true,
    ),
  )
  .catch((err: any) => {
    logger.error('Failed to login: ' + err, scope, true);
    process.exit(1);
  });
