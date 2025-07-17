import { EmbedBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { checkAdmin, commandBuilder,ensureGuildExistance,logWithTime } from "./utils";
import wol from 'wol';
import { getAllUserData, getAllUserDataTodayIs, getGuild, getPointGiverOfGuild, getUserData, getUserPoints, insertUserData, setPointGiverOfGuild, setTodayIsChannel, updateUserPoints } from "./database";

const wolCommand = commandBuilder(
  'magic',
  'does some magic (bot owner only)',
  async interaction => {
    if(!process.env.OWNER_DISCORD_ID){
      console.error('Current id: ',process.env.OWNER_DISCORD_ID);
      return await interaction.reply('No set owner ID');
    }

    if(!process.env.WOL_MAC || process.env.WOL_IP){
      console.error('Current MAC: ',process.env.WOL_MAC);
      console.error('Current IP: ',process.env.WOL_IP);
      return await interaction.reply('No set IP or MAC');
    }

    if (interaction.user.id === process.env.OWNER_DISCORD_ID) {
      await interaction.reply('magic...');
      wol.wake(process.env.WOL_MAC, {
        address: process.env.WOL_IP,
        port: 9
      }, function (error) {
        if (error) {
          logWithTime('Error:'+ error);
        } else {
          logWithTime('WOL command executed.');
        }
      });
    } else {
      await interaction.reply('You didn’t say the magic word...');
      logWithTime(
        'WOL command attempted by someone else:'+
        interaction.user.username
      );
    }
  }
);

const addPointsCommand = commandBuilder(
  'addpoints',
  'adds points to the user (can only be used by the servers point giver)',
  async interaction => {
    if (!interaction.guild) {
      return await interaction.reply(`This command can only be used in a server.`);
    }

    const pointGiverId = await getPointGiverOfGuild(interaction.guild.id) ?? "";

    if (interaction.user.id !== pointGiverId) {
      return await interaction.reply(`You cannot give points!`);
    }
    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if(!amount || !targetUser){
      return await interaction.reply(`You did not provide a target user or points!`);
    }

    if(amount<0){
      await interaction.reply(`Could not add ${amount} points for ${targetUser.username} as negative values are not accepted.`);
      logWithTime(`Error: Could not add \'${amount}\' points for \'${targetUser.username}\' as negative values are not accepted.`);
    }

    try {
      const row = await getUserPoints(targetUser.id);
      if(!row){
          await insertUserData(targetUser.id,0,0,amount);
      }else{
          await updateUserPoints(targetUser.id,amount+row.points,interaction);
      }
      if(targetUser.id === '1173596942194966571'){
        await interaction.reply(`Thank you <@${interaction.user.id}> for the ${amount} points`);
        logWithTime(`Points were given to the bot`);
      }else{
        await interaction.reply(`Added ${amount} points for ${targetUser.username}.`);
        logWithTime(`Points were given to \'${targetUser.username}\'`);
      }
    } catch (err) {
      console.error("Error updating user points:", err);
      await interaction.reply("An error occurred while adding points.");
    }
  },
  builder => {
    builder.addUserOption(option =>
      option.setName('target')
        .setDescription('The user to give points to')
        .setRequired(true)
    );
    builder.addIntegerOption(option =>
      option.setName('amount')
        .setDescription('The amount of points to give')
        .setRequired(true)
    );
    return builder;
  },
);

const leaderboardCommand = commandBuilder(
  'leaderboard',
  'Shows the top users on the pointboard.',
  async (interaction,client) => {
    try{
      const users = await getAllUserData();

      if(!users || users.length===0){
        return await interaction.reply("No user data available for the leaderboard.");
      }

      const leaderboard = 
      await Promise.all(users.slice(0,10).map(async (row, index) => {
        try {
          const user = await client.users.fetch(row.discordId);
          const username = user ? user.username : 'Unknown User';
          return `${index + 1}. ${username}: ${row.msg_count} messages, ${row.char_count} characters`;
        } catch (error) {
          console.error("Error fetching user:", error);
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
      logWithTime('Leaderboard command executed.');
    } catch (err) {
      console.error("Error getting point board:",err)
      await interaction.reply("An error occurred while getting the point leaderboard.");
    }
  }
);

const helpCommand = commandBuilder(
  'help',
  'Displays all commands.',
  async interaction => {
    const helpEmbed = new EmbedBuilder()
      .setColor('#3F48CC')
      .setTitle('List of Available Commands')
      .setDescription('Here are the commands you can use:')
      .addFields(
        { name: '/help', value: 'Displays all commands.' },
        { name: '/ping', value: 'Responds with "pong".' },
        { name: '/messages <username>', value: 'Displays the character count and message count for a user.' },
        { name: '/leaderboard', value: 'Displays the users with the most characters and messages.' },
        { name: '/cat', value: 'Responds with a cat picture.' },
        { name: '/addpoints', value: 'Give points to a user.' },
        { name: '/pointboard', value: 'Displays the users with the most points.' }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [helpEmbed] });
    logWithTime('Help command executed.');
  }
);

const pingCommand = commandBuilder(
  'ping',
  'Responds with "pong" to check if the bot is online.',
  async interaction => {
    await interaction.reply('pong');
    logWithTime('Ping command executed');
  }
);

const messagesCommand = commandBuilder(
  'messages',
  'Displays the message count for a specified user.',
  async interaction => {
    try{
      const targetUser = interaction.options.getUser('target');
      
      if(!targetUser){
        return await interaction.reply('No target user was provided.')
      }

      const user = await getUserData(targetUser.id);
      if(user){
        await interaction.reply(`User ${targetUser.username} has sent ${user.char_count} charachters in ${user.msg_count} message(s).`);
        logWithTime(`User ${targetUser.username}'s stats: char_count = ${user.char_count}, msg_count = ${user.msg_count}`);
      }else{
        await interaction.reply(`User ${targetUser.username} has not sent any messages yet.`);
        logWithTime(`User ${targetUser.username} has no message data.`);
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
      await interaction.reply("An error occurred while fetching user data.");
    }
  },
  builder => {
    builder.addUserOption(option =>
      option.setName('target')
        .setDescription('The user to check')
        .setRequired(true)
    )
    return builder;
  }    
);

const pointBoardCommand = commandBuilder(
  'pointboard',
  'Shows the top users on the pointboard.',
  async (interaction, client) => {
    try{
      const users = await getAllUserDataTodayIs();

      if(!users || users.length===0){
        return await interaction.reply("No user data available for the leaderboard.");
      }

      const pointboard = await Promise.all(users.map(async (row,index) => {
        try {
          const user = await client.users.fetch(row.discordId);
          const username = user ? user.username : 'Unknown User';
          return `${index + 1}. ${username}: ${row.points} points`;
        } catch (error) {
          console.error("Error fetching user:", error);
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
      logWithTime('Pointboard command executed.');
    } catch (err) {
      console.error("Error fetching pointboard data:", err);
      await interaction.reply("An error occurred while fetching the pointboard.");
    }
  }
);

const catCommand = commandBuilder(
  'cat',
  'Sends a random cat picture.',
  async interaction =>
  {
    try{
      const response = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await response.json();
      const imageUrl = data[0].url;

      const catEmbed = new EmbedBuilder()
        .setColor('#3F48CC')
        .setTitle("Here's a cat for you!")
        .setImage(imageUrl)
        .setTimestamp();

      await interaction.reply({ embeds: [catEmbed] });

      logWithTime('Cat command executed.');
    } catch (err) {
      console.error('Error fetching cat image:', err);
      await interaction.reply('Sorry, I couldn\'t fetch a cat image at the moment.');
    }
  }
);

const setPointGiverCommand = commandBuilder(
  'set_point_giver',
  'Sets the point giver for this server. (admin only)',
  async interaction => {
    if(!interaction.guildId){
      return await interaction.reply('This command can only be used in a server.')
    }

    await ensureGuildExistance(interaction);

    const guild = await getGuild(interaction.guildId);

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    if(!(await checkAdmin(interaction))){
      return await interaction.reply('Only an admin can use this command.');
    }

    const targetUser = interaction.options.getUser('target');

    if(!targetUser){
      return await interaction.reply('No target user was provided.');
    }

    await setPointGiverOfGuild(interaction.guildId,targetUser.id);
    await interaction.reply(guild.todayIsChannelId ? `set <@${targetUser.id}> as the server's point giver` : `set <@${targetUser.id}> as the server's point giver. Dont forget to also set a todayIs channel!`);
  },
  builder => {
    builder.addUserOption(option =>
      option.setName('target')
        .setDescription('The user put as point giver')
        .setRequired(true)
    )
    return builder;
  } 
);

const setTodayIsChannelCommand = commandBuilder(
  'setTodayIsChannel',
  'Sets the channel the bot will send the "today is x" message to. (admin only)',
  async interaction => {
    if(!interaction.guildId){
      return await interaction.reply('This command can only be used in a server.')
    }

    await ensureGuildExistance(interaction);

    const guild = await getGuild(interaction.guildId);

    if(!guild){
      return await interaction.reply(`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    if(!(await checkAdmin(interaction))){
      return await interaction.reply('Only an admin can use this command.');
    }

    const targetChannel = interaction.options.getString('target');

    if(!targetChannel){
      return await interaction.reply('No target channel was provided.');
    }

    await setTodayIsChannel(guild.guildId,targetChannel);
    await interaction.reply(guild.pointGiverId ? `set <#${targetChannel}> as the server's today is channel` : `set <#${targetChannel}> as the server's point giver. Dont forget to also set a point giver!`);
  },
  builder => {
    builder.addStringOption(option =>
      option.setName('target')
        .setDescription('The channel the bot will send the message to.')
        .setRequired(true)
    )
    return builder;
  }
)

interface Command {
  data: SlashCommandBuilder;
  name: string;
  execute: (...args: any[]) => Promise<any> | any;
}

export const commands: Command[] = [
  wolCommand,
  addPointsCommand,
  leaderboardCommand,
  helpCommand,
  pingCommand,
  messagesCommand,
  pointBoardCommand,
  catCommand,
  setPointGiverCommand,
  setTodayIsChannelCommand
]

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(command => command.data.toJSON());


