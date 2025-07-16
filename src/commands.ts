import { RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder } from "discord.js";
import { commandBuilder,logWithTime } from "./utils";
import wol from 'wol';
import { getPointGiverOfGuild, getUserPoints, insertUserData, updateUserPoints } from "./database";

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
  }
);

const commands: { 
  data: SlashCommandBuilder, 
  name: string, 
  description: string, 
  execute: Promise<any> | any }[] 
= [
  wolCommand,addPointsCommand
]

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(command => command.data.toJSON());


