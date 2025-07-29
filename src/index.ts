
import { ActionRowBuilder, Client, EmbedBuilder, Events, GatewayIntentBits, Interaction, Message, ModalBuilder, Partials, REST, Routes, TextChannel, TextInputBuilder, TextInputStyle } from 'discord.js';
import { setupCronJobs } from './cronJobs';
import { activePages, createReminderButtons, createReminderEmbed, ensureGuildExistance, logWithTime, parseDurationOrDateString, pendingReactionRoleSetups, safeReply } from './utils';
import { commands, commandsToRegister } from './commands';
import { addReactionRole, checkAndUpdateCount, deleteReminder, getLastCountUserAndHighestNumber, getReminderById, getRoleForReaction, getUserReminders, setLastCountUser, updateCountsForUser, updateReminder } from './database';
import { evaluate } from 'mathjs';
import dotenv from 'dotenv';

//#region Setup

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const ownerId = process.env.OWNER_DISCORD_ID;
export let botId: string;

if(!token || !process.env.DATABASE_URL){
	console.error('Token or database url not set.');
	process.exit(1);
}

if(!ownerId || !process.env.WOL_IP || !process.env.WOL_MAC){
	logWithTime('Owner id, WOL IP or WOL MAC not set','warn',true);
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

	botId = client.user!.id;

	const rest = new REST({ version: '10' }).setToken(token);
	try {
		await rest.put(
			Routes.applicationCommands(client.user!.id),
			{ body: commandsToRegister }
		);
		logWithTime('Slash commands registered.','info');
	} catch (error) {
		logWithTime('Error registering slash commands: '+error,'error',true);
	}
});

//#endregion

//#region Message creation

client.on(Events.MessageCreate, async (message: Message) => {
	if (message.author.bot) return;
	await updateCountsForUser(message.author,message.content);
	if (message.guildId) {
		const guild = await ensureGuildExistance(message.guildId);

		if(guild.countChannelId && guild.countChannelId === message.channelId){
			const content = message.content.trim();

			const checkArray = content.split(' ');
			if(checkArray.length > 1){
				return;
			}

			try {
				const result = evaluate(content);

				if (typeof result === 'number' && isFinite(result)) {
					const number: number = Math.round(result);
					const success = await checkAndUpdateCount(guild.guildId, number);
					const lastCountUser = await getLastCountUserAndHighestNumber(guild.guildId); // ? maybe make a cache for this

					if (!success) {
						await message.react('❌');
						await message.reply(`<@${message.author.id}> entered a wrong number! Next number is 1...`);
						await setLastCountUser(guild.guildId, '0');
					} else if(lastCountUser?.lastCountUser && lastCountUser.lastCountUser === message.author.id){
						await message.react('❌');
						await message.reply(`Only count on yourself, not with yourself... Next number is 1...`);
						await setLastCountUser(guild.guildId, '0');
					} else if(lastCountUser?.highestNumber && result > lastCountUser?.highestNumber){
						await message.react('☑️');
					} else {
						await message.react('✅');
					}
					await setLastCountUser(guild.guildId, message.author.id);
				}
			} catch (err) {
				logWithTime(`Invalid math expression: "${content}" — ${err}`,'error',true);
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
					.setTitle(session.title)
					.setDescription(description)
					.setColor('Blue');

				const sentMessage = await (channel as TextChannel).send({ embeds: [embed] });

				for (const emoji of Object.keys(emojiRoleMap)) {
					const newReactionRole = await addReactionRole(guild.guildId,sentMessage.id,session.targetChannelId,emoji,emojiRoleMap[emoji]);
					if(newReactionRole){
						await sentMessage.react(newReactionRole.emoji);
					} else {
						logWithTime(`Something went wrong while creating a reaction message`,'error',true);

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

//#endregion

//#region Interaction handling

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  if (interaction.guildId) {
    await ensureGuildExistance(interaction.guildId);
  }

  if (interaction.isChatInputCommand()) {
    const command = commands.find(c => c.name === interaction.commandName);

    if (!command) {
      return safeReply(
				interaction,
        `Unknown command: ${interaction.commandName}`,
        true,
      );
    }

    if (command.guildOnly && !interaction.guildId) {
      return await safeReply(interaction, 'This command can only be used in a server.');
    }

    if (command.permissionLevel === 'owner' && (!process.env.OWNER_DISCORD_ID || interaction.user.id !== ownerId)) {
      return await safeReply(interaction, 'You didn’t say the magic word...');
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      logWithTime(`Error executing command ${interaction.commandName}: `+ error,'error',true);
      if (!interaction.replied && !interaction.deferred) {
				await safeReply(interaction, 'There was an error executing that command.', true);
			}
    }
  }

  else if (interaction.isButton()) {
    if (['prev', 'next', 'edit', 'delete'].includes(interaction.customId)) {
      try {
        const userId = interaction.user.id;
				const reminders = await getUserReminders(userId);
				let index = activePages.get(userId) ?? 0;

				if (!reminders.length) {
					return interaction.update({ content: 'No more reminders.', embeds: [], components: [] });
				}

				switch (interaction.customId) {
					case 'prev':
						index = Math.max(0, index - 1);
						break;
					case 'next':
						index = Math.min(reminders.length - 1, index + 1);
						break;
					case 'delete': {
						await deleteReminder(reminders[index].id);
						const newReminders = await getUserReminders(userId);
						if (!newReminders.length) {
							return interaction.update({ content: 'All reminders deleted.', embeds: [], components: [] });
						}
						index = Math.min(index, newReminders.length - 1);
						const embed = createReminderEmbed(newReminders[index], index, newReminders.length);
						const buttons = [createReminderButtons(index, newReminders.length)];
						activePages.set(userId, index);
						return interaction.update({ embeds: [embed], components: buttons });
					}
					case 'edit': {
						const reminder = reminders[index];

						if (!reminder || reminder.userId !== interaction.user.id) {
							return await safeReply(interaction, 'Reminder not found or unauthorized.', true );
						}

						const modal = new ModalBuilder()
							.setCustomId(`editReminderModal:${reminder.id}`)
							.setTitle('Edit Reminder')
							.addComponents(
								new ActionRowBuilder<TextInputBuilder>().addComponents(
									new TextInputBuilder()
										.setCustomId('editMessage')
										.setLabel('Reminder Message')
										.setStyle(TextInputStyle.Paragraph)
										.setRequired(true)
										.setValue(reminder.message)
								),
								new ActionRowBuilder<TextInputBuilder>().addComponents(
									new TextInputBuilder()
										.setCustomId('editTime')
										.setLabel('Remind at (e.g. in 2 hours or in 3 days)')
										.setStyle(TextInputStyle.Short)
										.setRequired(true)
								)
							);

						return await interaction.showModal(modal);
					}
				}

				activePages.set(userId, index);
				const embed = createReminderEmbed(reminders[index], index, reminders.length);
				const buttons = [createReminderButtons(index, reminders.length)];

				await interaction.update({ embeds: [embed], components: buttons });
      } catch (error) {
        console.error(`Error handling reminder button:`, error);
        if (!interaction.replied) {
          await safeReply( interaction, 'Something went wrong with this button.', true );
        }
      }
    }
  } else if (interaction.isModalSubmit() && interaction.customId.startsWith('editReminderModal:')) {
		const reminderId = interaction.customId.split(':')[1];
		const newMessage = interaction.fields.getTextInputValue('editMessage');
		const newTimeString = interaction.fields.getTextInputValue('editTime');

		const reminder = await getReminderById(reminderId);
		if (!reminder || reminder.userId !== interaction.user.id) {
			return await safeReply(interaction, 'Reminder not found or unauthorized.', true );
		}

		const newRemindAt = parseDurationOrDateString(newTimeString);

		if (!newRemindAt || newRemindAt < new Date()) {
			return await safeReply(interaction, 'Invalid or past date.', true );
		}

		await updateReminder(reminderId, newMessage, newRemindAt);

		return await safeReply(
			interaction,
			`Reminder updated!\n**New Message:** ${newMessage}\n**New Time:** <t:${Math.floor(newRemindAt.getTime() / 1000)}:F>`,
			true
		);
	}
});

//#endregion

//#region Reaction add

client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;

  try {
    if (reaction.partial) await reaction.fetch();
    if (user.partial) await user.fetch();

    const { message } = reaction;
    if (message.partial) await message.fetch();

    const emoji = reaction.emoji.name!;
    const guildId = message.guildId;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId,messageId,emoji);

    if (!record) return;

    const member = await message.guild!.members.fetch(user.id);
    await member.roles.add(record.role);
		logWithTime(`Added role ${record.role} for user ${user.globalName} (${user.id}) in guild ${guildId}`,'info');
  } catch (err) {
    logWithTime('Failed to add role: '+err,'error',true);
  }
});

//#endregion

//#region Reaction remove

client.on(Events.MessageReactionRemove, async (reaction, user) => {
  if (user.bot) return;

  try {
    const { message } = reaction;

    const emoji = reaction.emoji.name!;
    const guildId = message.guild?.id;
    const messageId = message.id;

    if (!guildId) return;

    const record = await getRoleForReaction(guildId,messageId,emoji);

    if (!record) return;

    const member = await message.guild!.members.fetch(user.id);
    await member.roles.remove(record.role);
		logWithTime(`Removed role ${record.role} for user ${user.globalName} (${user.id}) in guild ${guildId}`,'info');
  } catch (err) {
    logWithTime('Failed to add role: '+err,'error',true);
  }
});

//#endregion

client.login(process.env.DISCORD_TOKEN)
.then(() => logWithTime(
		`logged in as ${client.user ? `${client.user.username}#${client.user.discriminator}` : 'ERROR' }`
	));
