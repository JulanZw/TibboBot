import { EmbedBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { commandBuilder,logWithTime } from "./utils";
import wol from 'wol';
import { getAllUserData, getAllUserDataTodayIs, getPointGiverOfGuild, getUserData, getUserPoints, insertUserData, updateUserPoints } from "./database";

const wolCommand = commandBuilder(
  'magic',
  'does some magic (bot owner only)',
  async interaction => {
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
      console.error("Error updating user points:", err.message);
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
  'pointboard',
  'Shows the top users on the pointboard.',
  async (interaction,client) => {
    try{
      const users = await getAllUserData();

      if(!users || users.length===0){
        return await interaction.reply("No user data available for the leaderboard.");
      }

      const leaderboard = 
      users.slice(0,10).map(async (row, index) => {
        try {
            const user = await client.users.fetch(row.discordId);
            const username = user ? user.username : 'Unknown User';
            return `${index + 1}. ${username}: ${row.msg_count} messages, ${row.char_count} characters`;
        } catch (error) {
            console.error("Error fetching user:", error);
            return `${index + 1}. Unknown User: ${row.msg_count} messages, ${row.char_count} characters`;
        }
      });

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
      console.error("Error getting point board:",err.message)
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
      console.error("Error fetching user data:", err.message);
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

      const pointboard = users.map(async (row,index) => {
        try {
          const user = await client.users.fetch(row.discordId);
          const username = user ? user.username : 'Unknown User';
          return `${index + 1}. ${username}: ${row.points} points`;
        } catch (error) {
          console.error("Error fetching user:", error);
          return `${index + 1}. Unknown User: ${row.points} points`;
        }
      });

      const pointboardString = pointboard.join('\n');

      const pointboardEmbed = new EmbedBuilder()
        .setColor('#3F48CC')
        .setTitle('Pointboard')
        .setDescription(pointboardString)
        .setTimestamp();
      await interaction.reply({ embeds: [pointboardEmbed] });
      logWithTime('Pointboard command executed.');
    } catch (err) {
      console.error("Error fetching pointboard data:", err.message);
      await interaction.reply("An error occurred while fetching the pointboard.");
    }
  }
)

const commands: { 
  data: SlashCommandBuilder, 
  name: string, 
  description: string, 
  execute: Promise<any> | any }[]
= [
  wolCommand,addPointsCommand,leaderboardCommand,helpCommand,pingCommand,messagesCommand,pointBoardCommand
]

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(command => command.data.toJSON());


