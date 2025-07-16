
import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import { setupCronJobs } from './cronJobs';
import { logWithTime } from './utils';
import { commands, commandsToRegister } from './commands';
import { getUserData, insertUserData, updateUserCharMsgCount } from './database';

const token = process.env.DISCORD_TOKEN;

if(!token){
	console.error('Token not set.');
	process.exit(1);
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.once('ready', async () =>{
	setupCronJobs(client);

	const rest = new REST({ version: '10' }).setToken(token);
	try {
		await rest.put(
			Routes.applicationCommands(client.user!.id),
			{ body: commandsToRegister }
		);
		logWithTime('Slash commands registered.');
	} catch (error) {
		console.error('Error registering slash commands:', error);
	}
});

client.on('messageCreate', async (message) => {
	if (message.author.bot) return;

	const userId = message.author.id;
	const messageLength = message.content.length;

	try {
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
	} catch (err) {
		console.error('Error processing user data:', err.message);
	}
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isCommand()) return;

	const command = commands.find(command => command.name === interaction.commandName);

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

client.login(process.env.DISCORD_TOKEN).then(() => logWithTime(`logged in as ${client.user!.username}#${client.user!.discriminator}`))
