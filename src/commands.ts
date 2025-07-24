import { EmbedBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from 'discord.js';
import { commandBuilder,formatDate,getDateKey,logWithTime, parseDurationOrDate, pendingReactionRoleSetups, PermissionLevel, reminderDaysCache } from './utils';
import wol from 'wol';
import { createReminder, getAllUserData, getAllUserDataTodayIs, getGuild, getPointGiverIdOfGuild, getUserData, getUserPoints, getUserReminders, insertUserData, setBirthday, setBirthdayChannel, setCountChannel, setPointGiverOfGuild, setTodayIsChannel, updateUserPoints } from './database';
import { channelOption, integerOption, stringOption, userOption } from './options';

//#region Utility

const wolCommand = commandBuilder(
  'magic',
  'does some magic (bot owner only)',
  async (interaction, client) => {
    if(!process.env.WOL_MAC || process.env.WOL_IP){
      console.error('Current MAC: ',process.env.WOL_MAC);
      console.error('Current IP: ',process.env.WOL_IP);
      return await interaction.reply('No set IP or MAC');
    }

    await interaction.reply('magic...');
    wol.wake(process.env.WOL_MAC, {
      address: process.env.WOL_IP,
      port: 9
    }, function (error) {
      if (error) {
        logWithTime('Error:'+ error, 'error',true);
      }
    });
  },
  false,
  'owner'
);

const helpCommand = commandBuilder(
  'help',
  'Displays all commands.',
  async (interaction, client) => {
    const helpEmbed = new EmbedBuilder()
      .setColor('#3F48CC')
      .setTitle('List of Available Commands')
      .setDescription('Here are the commands you can use:')
      .addFields(
        commands.map(cmd => ({
          name: `/${cmd.name}`,
          value: cmd.description
        }))
      )
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });
  },
  false,
  'user'
);

const pingCommand = commandBuilder(
  'ping',
  'Responds with "pong" to check if the bot is online.',
  async (interaction, client) => {
    await interaction.reply('pong');
  },
  false,
  'user'
);

//#endregion

//#region Chars And Messages

const messagesCommand = commandBuilder(
  'messages',
  'Displays the message count for a specified user.',
  async (interaction, client) => {
    const targetUser = interaction.options.getUser('target');
    
    if(!targetUser){
      return await interaction.reply('No target user was provided.')
    }

    const user = await getUserData(targetUser.id);
    if(user){
      await interaction.reply(`User ${targetUser.username} has sent ${user.char_count} charachters in ${user.msg_count} message(s).`);
    }else{
      await interaction.reply(`User ${targetUser.username} has not sent any messages yet.`);
    }
  },
  false,
  'user',
  builder => {
    builder.addUserOption(userOption('target','The user to check'));
    return builder;
  }    
);

const leaderboardCommand = commandBuilder(
  'leaderboard',
  'Shows the top users on the message count board.',
  async (interaction,client) => {
    const users = await getAllUserData();

    if(!users || users.length===0){
      return await interaction.reply('No user data available for the leaderboard.');
    }

    const leaderboard = 
    await Promise.all(users.slice(0,10).map(async (row, index) => {
      try {
        const user = await client.users.fetch(row.discordId);
        const username = user ? user.username : 'Unknown User';
        return `${index + 1}. ${username}: ${row.msg_count} messages, ${row.char_count} characters`;
      } catch (error) {
        logWithTime('Error fetching user:'+error,'error');
        return `${index + 1}. Unknown User: ${row.msg_count} messages, ${row.char_count} characters`;
      }
    }));

    const leaderboardString = leaderboard.join('\n');

    const leaderboardEmbed = 
    new EmbedBuilder()
      .setColor('#3F48CC')
      .setTitle('Leaderboard')
      .setDescription(leaderboardString)
      .setTimestamp();
    await interaction.reply({ embeds: [leaderboardEmbed] });
  },
  false,
  'user'
);

//#endregion

//#region Cat

const catCommand = commandBuilder(
  'cat',
  'Sends a random cat picture.',
  async (interaction, client) =>
  {
    try{
      const response = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await response.json();
      const imageUrl = data[0].url;

      const catEmbed = new EmbedBuilder()
        .setColor('#3F48CC')
        .setTitle('Here\'s a cat for you!')
        .setImage(imageUrl)
        .setTimestamp();

      await interaction.reply({ embeds: [catEmbed] });
    } catch (err) {
      logWithTime('Error fetching cat image:'+err,'warn',true);
      await interaction.reply('Sorry, I couldn\'t fetch a cat image.');
    }
  },
  false,
  'user'
);

//#endregion

//#region Today Is

const setPointGiverCommand = commandBuilder(
  'set_point_giver',
  'Sets the point giver for this server. (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string);

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetUser = interaction.options.getUser('target');

    if(!targetUser){
      return await interaction.reply('No target user was provided.');
    }

    await setPointGiverOfGuild(interaction.guildId as string,targetUser.id);
    await interaction.reply(guild.todayIsChannelId ? `set <@${targetUser.id}> as the server's point giver` : `set <@${targetUser.id}> as the server's point giver. Dont forget to also set a todayIs channel!`);
    logWithTime(`Set ${targetUser.id} as pointgiver for ${guild.guildId}`,'info');
  },
  true,
  'admin',
  builder => {
    builder.addUserOption(userOption('target','The user put as point giver'));
    return builder;
  } 
);

const setTodayIsChannelCommand = commandBuilder(
  'setTodayIsChannel',
  'Sets the channel the bot will send the "today is x" message to. (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string); // ? this gets checked in the main loop before it reaches this

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetChannel = interaction.options.getChannel('target');

    if(!targetChannel){
      return await interaction.reply('No target channel was provided.');
    }

    await setTodayIsChannel(guild.guildId,targetChannel.id);
    await interaction.reply(guild.pointGiverId ? `set <#${targetChannel}> as the server's today is channel` : `set <#${targetChannel}> as the server's point giver. Dont forget to also set a point giver!`);
    logWithTime(`Set <#${targetChannel}> as today is channel for ${guild.guildId}`);
  },
  true,
  'admin',
  builder => {
    builder.addChannelOption(channelOption('taget','The channel the bot will send the birthday messages to.'));
    return builder;
  }
);

const addPointsCommand = commandBuilder(
  'addpoints',
  'adds points to the user (can only be used by the servers point giver)',
  async (interaction, client) => {
    const pointGiverId = await getPointGiverIdOfGuild(interaction.guildId as string);

    if(!pointGiverId){
      return await interaction.reply('This server doesnt have a point giver')
    }

    if (interaction.user.id !== pointGiverId) {
      return await interaction.reply(`Only <@${pointGiverId}> can give points`);
    }

    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if(!amount || !targetUser){
      return await interaction.reply(`You did not provide a target user or points!`);
    }

    if(amount<0){
      await interaction.reply(`Could not add ${amount} points for ${targetUser.username} as negative values are not accepted.`);
      logWithTime(`Error: Could not add \'${amount}\' points for \'${targetUser.username}\' as negative values are not accepted.`,'error',true);
    }

    const row = await getUserPoints(targetUser.id);
    if(!row){
      await insertUserData(targetUser.id,BigInt(0),0,BigInt(amount));
    }else{
      await updateUserPoints(targetUser.id,BigInt(amount)+row.points,interaction);
    }
    if(targetUser.id === (process.env.BOT_ID ?? '0')){
      await interaction.reply(`Thank you <@${interaction.user.id}> for the ${amount} points`);
      logWithTime(`${amount} points were given to the bot`);
    }else{
      await interaction.reply(`Added ${amount} points for ${targetUser.username}.`);
      logWithTime(`${amount} points were given to \'${targetUser.username}\'`);
    }
  },
  false,
  'admin',
  builder => {
    builder.addUserOption(userOption('taget','The user to give points to'));
    builder.addIntegerOption(integerOption('amount','The amount of points to give'));
    return builder;
  },
);

const todayIsBoardCommand = commandBuilder(
  'todayisboard',
  'Shows the top users on the today is leaderboard.',
  async (interaction, client) => {
    const users = await getAllUserDataTodayIs();

    if(!users || users.length===0){
      return await interaction.reply('No user data available for the leaderboard.');
    }

    const pointboard = await Promise.all(users.map(async (row,index) => {
      try {
        const user = await client.users.fetch(row.discordId);
        const username = user ? user.username : 'Unknown User';
        return `${index + 1}. ${username}: ${row.points} points`;
      } catch (error) {
        console.error('Error fetching user:', error);
        return `${index + 1}. Unknown User: ${row.points} points`;
      }
    }));

    const pointboardString = pointboard.join('\n');

    const pointboardEmbed = new EmbedBuilder()
      .setColor('#3F48CC')
      .setTitle('Pointboard')
      .setDescription(pointboardString)
      .setTimestamp();
    await interaction.reply({ embeds: [pointboardEmbed] });
  },
  false,
  'user'
);

//#endregion

//#region Birthday

const setBirthdayChannelCommand = commandBuilder(
  'setbirthdaychannel',
  'Sets the birthday channel of the guild. (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string); // ? this gets checked in the main loop before it reaches this

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetChannel = interaction.options.getChannel('target');

    if(!targetChannel){
      return await interaction.reply('No target channel was provided.');
    }

    await setBirthdayChannel(guild.guildId,targetChannel.id)
    await interaction.reply(`set <#${targetChannel}> as the server's birthday channel`);
    logWithTime(`Set <#${targetChannel}> as birthday channel for ${guild.guildId}`);
  },
  true,
  'admin',
  builder => {
    builder.addChannelOption(channelOption('taget','The channel the bot will send the birthday messages to.'));
    return builder;
  }
);

const setBirthdayCommand = commandBuilder(
  'setBirthday',
  'Set your birthday for this server',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string); // ? this gets checked in the main loop before it reaches this

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const date = interaction.options.getString('date');

    if(!date){
      return await interaction.reply('No birthday was provided');
    }

    const birthday = new Date(date);

    const newBirthday = await setBirthday(guild.guildId,interaction.user.id,birthday);
    
    if(!newBirthday){
      return await interaction.reply('Something went wrong while setting your birthday...');
    } else {
      logWithTime(`Set birthday for <@${newBirthday.userId}> on ${formatDate(newBirthday.birthday)}`);
      return await interaction.reply(`Set birthday for <@${newBirthday.userId}> on ${formatDate(newBirthday.birthday)}`);
    }
  },
  false,
  'admin',
  builder => {
    builder.addStringOption(stringOption('date','Enter a date (YYYY-MM-DD)'));
    return builder;
  },
);

//#endregion

//#region Count

const setCountChannelCommand = commandBuilder(
  'setcountchannel',
  'Sets the count channel of the guild. (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string); // ? this gets checked in the main loop before it reaches this

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetChannel = interaction.options.getChannel('target');

    if(!targetChannel){
      return await interaction.reply('No target channel was provided.');
    }

    await setCountChannel(guild.guildId,targetChannel.id)
    await interaction.reply(`set <#${targetChannel}> as the server's count channel`);
    logWithTime(`Set <#${targetChannel}> as count channel for ${guild.guildId}`);
  },
  true,
  'admin',
  builder => {
    builder.addChannelOption(channelOption('taget','Sets the channel where members can count to infinity.'));
    return builder;
  }
);

//#endregion

//#region Reaction Roles

export const reactionRolesCommand = commandBuilder(
  'reactionroles',
  'Set up a reaction role message dynamically. (admin only)',
  async (interaction, client) => {
    const userId = interaction.user.id;

    const targetChannel = interaction.options.getChannel('target');

    if(!targetChannel){
      return await interaction.reply('No target channel was provided.');
    }

    pendingReactionRoleSetups.set(userId, {
      interaction,
      emojiRoleMap: {},
      channelId: interaction.channelId,
      targetChannelId: targetChannel.id
    });

    await interaction.reply({
      content:
        'Please send the emoji + role pairs in this format: `🟥 @RedTeam`\nSend `done` when finished.',
      ephemeral: true
    });
    logWithTime('Reaction message proces started','info');
  },
  true,
  'admin',
  builder => {
    builder.addChannelOption(channelOption('taget','The channel where reaction message will be in.'));
    return builder;
  }
);

//#endregion

//#region Reminders

const setReminderCommand = commandBuilder(
  'setreminder',
  'Sets a reminder',
  async interaction => {
    const when = interaction.options.getString('when', true);
    const message = interaction.options.getString('message', true);

    const targetTime = parseDurationOrDate(when);
    if (!targetTime) {
      return await interaction.reply({ content: 'Invalid date/time format.', ephemeral: true });
    }

    const maxTime = Date.now() + 1000 * 60 * 60 * 24 * 365;
    if (targetTime.getTime() > maxTime) {
      return await interaction.reply({ content: 'Reminders can only be up to 1 year in the future.', ephemeral: true });
    }

    const userReminders = await getUserReminders(interaction.user.id);
    if(userReminders.length > 10){
      return await interaction.reply({ content: 'You cannot have more than 10 reminders!', ephemeral: true });
    }

    const reminder = await createReminder(interaction.user.id,message,targetTime);

    const maxCacheDate = new Date();
    maxCacheDate.setDate(new Date().getDate() + 7);
    if(targetTime < maxCacheDate){
      const dateKey = getDateKey(reminder.remindAt);
      if (!reminderDaysCache.has(dateKey)) {
        reminderDaysCache.set(dateKey, []);
      }
      reminderDaysCache.get(dateKey)!.push(reminder);
    }

    await interaction.reply({
      content: `Reminder set for <t:${Math.floor(targetTime.getTime() / 1000)}:F>, make sure you have direct messages turned on for this server!`,
      ephemeral: true,
    });
    logWithTime(`Created reminder for ${interaction.user.id} on ${targetTime}`,'info');
  },
  false,
  'user',
  builder => {
    builder.addStringOption(stringOption('when','When you need to be reminded',true));
    builder.addStringOption(stringOption('message','What you needed to be reminded of',true));
    return builder;
  }
);

//#endregion

//#region General

/**
 * Represents a Discord slash command definition.
 *
 * Used internally to register and execute slash commands,
 * and to apply custom restrictions like admin or guild-only use.
 *
 * @property data - The actual slash command builder used for Discord.
 * @property name - The name of the command.
 * @property description - The description of the command.
 * @property adminOnly - Whether the command can only be executed by an admin (internal check).
 * @property guildOnly - Whether the command can only be executed in a guild (internal check).
 * @property execute - The function that runs when the command is used.
 */
export interface Command {
  data: SlashCommandBuilder;
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  guildOnly: boolean;
  execute: (...args: any[]) => Promise<any> | any;
}

export const commands: Command[] = [
  wolCommand,
  addPointsCommand,
  leaderboardCommand,
  helpCommand,
  pingCommand,
  messagesCommand,
  todayIsBoardCommand,
  catCommand,
  setPointGiverCommand,
  setTodayIsChannelCommand,
  setBirthdayChannelCommand,
  setBirthdayCommand,
  setCountChannelCommand,
  setReminderCommand
]

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(command => command.data.toJSON());

//#endregion