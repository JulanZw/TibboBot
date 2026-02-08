import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  Message,
  Partials,
  REST,
  Routes,
} from 'discord.js';

import { setupCronJobs } from './cronJobs.ts';
import { getCommandsToRegister } from './commands.ts';
import { ownerId, prisma, token } from './utils/globals.ts';
import { handleInteractionCreation } from './handlers/interactionCreation.ts';
import { handleReactionAdded } from './handlers/reactionAdded.ts';
import { handleReactionRemoval } from './handlers/reactionRemoved.ts';
import { handleMessageDeletion } from './handlers/messageDeletion.ts';
import { getRemindersOfToday } from './database/reminders.ts';
import { handleMessageCreation } from './handlers/messageCreation.ts';
import { logWithTime } from './utils/logging.ts';
import { setupErrorHandlers } from './handlers/errors.ts';
import { scheduleReminder } from './utils/managers/reminderManager.ts';

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

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.once('ready', async (readyClient) => {
  setupCronJobs(readyClient);
  setupErrorHandlers(readyClient, prisma);

  if (!token || !process.env.DATABASE_URL) {
    logWithTime('Token or database url not set.', 'error', scope, true);
    process.exit(1);
  }

  if (!ownerId || !process.env.WOL_IP || !process.env.WOL_MAC) {
    logWithTime('Owner id, WOL IP or WOL MAC not set', 'warn', scope, true);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    const commands = getCommandsToRegister();
    await rest.put(Routes.applicationCommands(readyClient.user.id), {
      body: commands,
    });
    logWithTime(`${commands.length} Slash commands registered.`, 'info', scope);

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

        logWithTime(
          `Scheduled ${todaysReminders.length} reminders for today.`,
          'info',
          scope,
        );
      } catch (err: any) {
        logWithTime(
          `Failed to schedule today's reminders: ${err}`,
          'error',
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
    logWithTime(
      'Error registering slash commands: ' + err,
      'error',
      scope,
      true,
    );
  }
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.on(Events.MessageCreate, async (message: Message) => {
  await handleMessageCreation(message);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  await handleInteractionCreation(interaction);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  await handleReactionAdded(reaction, user);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.on(Events.MessageReactionRemove, async (reaction, user) => {
  await handleReactionRemoval(reaction, user);
});

// eslint-disable-next-line @typescript-eslint/no-misused-promises
client.on(Events.MessageDelete, async (message) => {
  await handleMessageDeletion(message);
});

client
  .login(process.env.DISCORD_TOKEN)
  .then(() =>
    logWithTime(
      `Logged in as ${client.user ? `${client.user.username}#${client.user.discriminator}` : 'ERROR'}`,
      'info',
      scope,
      true,
    ),
  )
  .catch((err: any) => {
    logWithTime('Failed to login: ' + err, 'error', scope, true);
    process.exit(1);
  });
