const { SlashCommandBuilder } = require('@discordjs/builders');
const database = require('../database');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addpoints')
        .setDescription('adds points to the user (can only be used by the point-giver role)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to give points to')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The amount of points to give')
                .setRequired(true)
        ),
    name: 'addpoints',
    description: 'adds points to the user (can only be used by the point-giver role)',

    async execute(interaction,client) {
        if(!(interaction.user.id === '811497478015811634')){
            return await interaction.reply(`You cannot give points!`);
        }
        const targetUser = interaction.options.getUser('target');
        const amount = interaction.options.getInteger('amount');
        if(amount<0){
            await interaction.reply(`Could not add ${amount} points for ${targetUser.username} as negative values are not accepted.`);
            utils.logWithTime(`Error: Could not add \'${amount}\' points for \'${targetUser.username}\' as negative values are not accepted.`);
        }

        try {
            const row = await database.getUserPoints(targetUser.id);
            if(!row){
                await database.insertUserPoints(targetUser.id,amount);
            }else{
                await database.updateUserPoints(targetUser.id,amount+row.points,interaction);
            }
            if(targetUser.id === '1173596942194966571'){
                await interaction.reply(`Thank you <@${interaction.user.id}> for the ${amount} points`);
                utils.logWithTime(`Points were given to the bot`);
                utils.logToChannel(`Points were given to the bot`,client);
            }else{
                await interaction.reply(`Added ${amount} points for ${targetUser.username}.`);
                utils.logWithTime(`Points were given to \'${targetUser.username}\'`);
                utils.logToChannel(`Points were given to \'${targetUser.username}\'`,client);
            }
        } catch (err) {
            console.error("Error updating user points:", err.message);
            await interaction.reply("An error occurred while adding points.");
        }
    }
};
