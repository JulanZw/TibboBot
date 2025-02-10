const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const util = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays all commands.'),

    name: 'help',
    description: 'Displays all commands.',

    async execute(interaction,client) {
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
        util.logWithTime('Help command executed.');
        util.logToChannel('Help command executed.',client)
    }
};
