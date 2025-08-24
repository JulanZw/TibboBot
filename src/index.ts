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

import { setupCronJobs } from './cronJobs';
import { scheduleReminder } from './utils/general';
import { commandsToRegister } from './commands';
import { ownerId, prisma, token } from './utils/globals';
import { handleInteractionCreation } from './handlers/interactionCreation';
import { handleReactionAdded } from './handlers/reactionAdded';
import { handleReactionRemoval } from './handlers/reactionRemoved';
import { handleMessageDeletion } from './handlers/messageDeletion';
import { getRemindersOfToday } from './database/reminders';
import { handleMessageCreation } from './handlers/messageCreation';
import { logWithTime } from './utils/logging';
import { setupErrorHandlers } from './handlers/errors';

const scope = 'startup';

//#region Setup

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
client.once('ready', async (client) => {
  setupCronJobs(client);
  setupErrorHandlers(client, prisma);

  if (!token || !process.env.DATABASE_URL) {
    logWithTime('Token or database url not set.', 'error', scope, true);
    process.exit(1);
  }

  if (!ownerId || !process.env.WOL_IP || !process.env.WOL_MAC) {
    logWithTime('Owner id, WOL IP or WOL MAC not set', 'warn', scope, true);
  }

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(Routes.applicationCommands(client.user.id), {
      body: commandsToRegister,
    });
    logWithTime(
      `${commandsToRegister.length} Slash commands registered.`,
      'info',
      scope,
    );

    if (process.env.ENV !== 'dev') {
      client.user.setStatus('online');
      client.user.setActivity('commands', { type: ActivityType.Listening });
      try {
        const todaysReminders = await getRemindersOfToday();

        for (const reminder of todaysReminders) {
          const user = await client.users.fetch(reminder.userId);
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
      client.user.setStatus('dnd');
      client.user.setActivity('Being tested', {
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
    ),
  )
  .catch((err: any) => {
    logWithTime('Failed to login: ' + err, 'error', scope, true);
    process.exit(1);
  });
