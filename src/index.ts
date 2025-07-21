
import { Client, GatewayIntentBits, Interaction, Message, REST, Routes } from 'discord.js';
import { setupCronJobs } from './cronJobs';
import { checkAdmin, ensureGuildExistance, logWithTime, updateCounts } from './utils';
import { commands, commandsToRegister } from './commands';
import { checkAndUpdateCount, getCountChannelOfGuild, getGuild } from './database';
import { evaluate } from 'mathjs';

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
	if (message.guildId) {
		const guild = await ensureGuildExistance(message.guildId);

		if(!guild.countChannelId || guild.countChannelId !== message.channelId) return;

		const content = message.content.trim();

		try {
			const result = evaluate(content);

			if (typeof result === 'number' && isFinite(result)) {
				const number: number = Math.round(result);
				const success = await checkAndUpdateCount(guild.guildId, number);

				if (!success) {
					await message.react('❌');
					await message.reply(`<@${message.author.id}> entered a wrong number! Next number is 1...`);
				} else {
					await message.react('✅');
				}
			}

		} catch (err) {
			logWithTime(`Invalid math expression: "${content}" — ${err}`);
		}
	}
});

client.on('interactionCreate', async (interaction: Interaction) => {
	if(interaction.guildId){
		await ensureGuildExistance(interaction.guildId);
	}

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
