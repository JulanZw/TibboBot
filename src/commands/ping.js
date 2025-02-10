const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Responds with "pong" to check if the bot is online.'),
    name: 'ping',
    description: 'Responds with "pong" to check if the bot is online.',

    async execute(interaction,client) {
        await interaction.reply('pong');
        utils.logWithTime('Ping command executed.');
        utils.logToChannel('Ping command executed.',client)
    }
};
