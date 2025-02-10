const { Client, GatewayIntentBits, REST, Routes, Collection } = require('discord.js');
const commands = require('./commands/router');
const utils = require('./utils');
const cronJob = require('./cronJobs');
const db = require('./database');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();
const slashCommands = [];

// Register commands from router
for (const name in commands) {
    const command = commands[name];
    client.commands.set(command.name, command);
    slashCommands.push(command.data.toJSON()); // Prepare for registration with Discord
}

client.once('ready', async () => {
    // Setup cron jobs
    cronJob.setupCronJobs(client);

    // Register slash commands globally
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        utils.logWithTime('Slash commands registered.');
        await utils.logToChannel('Slash commands registered.',client);
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const userId = message.author.id;
    const messageLength = message.content.length;

    // Track message and character count
    try {
        const row = await db.getUserData(userId);
        if (row) {
            const newCharCount = row.char_count + messageLength;
            const newMsgCount = row.msg_count + 1;
            await db.updateUserData(userId, newCharCount, newMsgCount, message);
            utils.logWithTime(`Updated user messages and characters for ${message.author.id} [${message.author.username}]`);
            utils.logToChannel(`Updated user messages and characters for ${message.author.id} [${message.author.username}]`,client);
        } else {
            await db.insertUserData(userId, messageLength, 1);
            utils.logWithTime(`Added new user for counting messages and characters for ${message.author.id} [${message.author.username}]`);
            utils.logToChannel(`Added new user for counting  messages and characters for ${message.author.id} [${message.author.username}]`,client);
        }
    } catch (err) {
        console.error('Error processing user data:', err.message);
    }
});

// Handle slash command interactions
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        return interaction.reply({ content: `Unknown command: ${interaction.commandName}`, ephemeral: true });
    }

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
});

client.login(process.env.DISCORD_TOKEN)
    .then(r => utils.logWithTime(`logged in as ${client.user.username}#${client.user.discriminator}`))
    .then(r => utils.logToChannel(`=====================[Restarted]========================`,client))
    .then(r => utils.logToChannel(`logged in as ${client.user.username}#${client.user.discriminator}`,client)
);
