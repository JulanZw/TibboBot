
import { Client, EmbedBuilder, GatewayIntentBits, Interaction, Message, Partials, REST, Routes, TextChannel } from 'discord.js';
import { setupCronJobs } from './cronJobs';
import { ensureGuildExistance, logWithTime, pendingReactionRoleSetups, updateCounts } from './utils';
import { commands, commandsToRegister } from './commands';
import { addReactionRole, checkAndUpdateCount, getLastCountUser, getRoleForReaction } from './database';
import { evaluate } from 'mathjs';

const token = process.env.DISCORD_TOKEN;
const ownerId = process.env.OWNER_DISCORD_ID

if(!token || !ownerId){
	console.error('Token or owner id not set.');
	process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Reaction, Partials.User],
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

		if(guild.countChannelId && guild.countChannelId === message.channelId){
			const content = message.content.trim();

			try {
				const result = evaluate(content);

				if (typeof result === 'number' && isFinite(result)) {
					const number: number = Math.round(result);
					const success = await checkAndUpdateCount(guild.guildId, number);
					const lastCountUser = await getLastCountUser(guild.guildId);

					if (!success) {
						await message.react('❌');
						await message.reply(`<@${message.author.id}> entered a wrong number! Next number is 1...`);
					} else if(lastCountUser && lastCountUser === message.author.id){
						await message.react('❌');
						await message.reply(`Only count on yourself, not with yourself... Next number is 1...`);
					}else {
						await message.react('✅');
					}
				}
			} catch (err) {
				logWithTime(`Invalid math expression: "${content}" — ${err}`);
			}
		}

		const session = pendingReactionRoleSetups.get(message.author.id);

		if(session && message.channelId === session.channelId){
			if (message.content.toLowerCase() === 'done') {
				const { emojiRoleMap, interaction, channelId } = session;
				const channel = await client.channels.fetch(channelId);
				if (!channel?.isTextBased()) return;

				if (Object.keys(emojiRoleMap).length === 0) {
					await message.reply('No emoji-role pairs were added.');
					pendingReactionRoleSetups.delete(message.author.id);
					return;
				}

				const description = Object.entries(emojiRoleMap)
					.map(([emoji, roleId]) => `${emoji} = <@&${roleId}>`)
					.join('\n');

				const embed = new EmbedBuilder()
					.setTitle('Choose your role!')
					.setDescription(description)
					.setColor('Blue');

				const sentMessage = await (channel as TextChannel).send({ embeds: [embed] });

				for (const emoji of Object.keys(emojiRoleMap)) {
					const newReactionRole = await addReactionRole(guild.guildId,message.id,session.targetChannelId,emoji,emojiRoleMap[emoji]);
					if(newReactionRole){
						await sentMessage.react(newReactionRole.emoji);
					} else {
						logWithTime(`Something went wrong while creating a reaction message`);

						return await interaction.followUp({
							content: 'Something went wrong while creating the message.',
							ephemeral: true
						});
					}
				}

				await interaction.followUp({
					content: 'Reaction role message created!',
					ephemeral: true
				});

				pendingReactionRoleSetups.delete(message.author.id);
				return;
			}

			const match = message.content.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s+<@&(\d+)>$/u);
			if (!match) {
				await message.reply('Invalid format. Please use `🟥 @RoleMention`.');
				return;
			}

			const [, emoji, roleId] = match;
			session.emojiRoleMap[emoji] = roleId;

			await message.reply(`Added mapping: ${emoji} -> <@&${roleId}>`);
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

	if(command.permissionLevel === 'owner' && interaction.user.id !== ownerId){
    return await interaction.reply('You didn’t say the magic word...');
  }

	try {
		await command.execute(interaction, client);
	} catch (error) {
		console.error(`Error executing command ${interaction.commandName}:`, error);
		await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();

    const { message } = reaction;
    if (message.partial) await message.fetch();

    const emoji = reaction.emoji.name!;
    const guildId = message.guild?.id;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId,messageId,emoji);

    if (!record) return;

    const member = await message.guild!.members.fetch(user.id);
    await member.roles.add(record.role);
  } catch (err) {
    console.error('Failed to add role:', err);
  }
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();

    const { message } = reaction;
    if (message.partial) await message.fetch();

    const emoji = reaction.emoji.name!;
    const guildId = message.guild?.id;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId,messageId,emoji);

    if (!record) return;

    const member = await message.guild!.members.fetch(user.id);
    await member.roles.remove(record.role);
  } catch (err) {
    console.error('Failed to remove role:', err);
  }
});

client.login(process.env.DISCORD_TOKEN).then(() => logWithTime(`logged in as ${client.user!.username}#${client.user!.discriminator}`))
