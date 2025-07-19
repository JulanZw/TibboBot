
import { Client, GatewayIntentBits, Interaction, Message, REST, Routes } from 'discord.js';
import { setupCronJobs } from './cronJobs';
import { checkAdmin, ensureGuildExistance, logWithTime, updateCounts } from './utils';
import { commands, commandsToRegister } from './commands';

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

client.on('messageCreate', async (message: Message) => {
	if (message.author.bot) return;
	await updateCounts(message);
	await ensureGuildExistance(message);
});

client.on('interactionCreate', async (interaction: Interaction) => {
	await ensureGuildExistance(interaction);
	if (!interaction.isCommand()) return;

	const command = commands.find(command => command.name === interaction.commandName);

	if (!command) {
		return interaction.reply({ content: `Unknown command: ${interaction.commandName}`, ephemeral: true });
	}

	if(command.guildOnly && !interaction.guildId){
    return await interaction.reply('This command can only be used in a server.');
	}

	if(command.adminOnly && !(await checkAdmin(interaction))){
    return await interaction.reply('Only an admin can use this command.');
  }

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(`Error executing command ${interaction.commandName}:`, error);
		await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
	}
});

client.login(process.env.DISCORD_TOKEN).then(() => logWithTime(`logged in as ${client.user!.username}#${client.user!.discriminator}`))
