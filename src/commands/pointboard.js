const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pointboard')
        .setDescription('Shows the top users on the pointboard.'),

    name: 'pointboard',
    description: 'Shows the top users on the pointboard.',

    async execute(interaction, client) {
        try {
            const rows = await database.getAllUserDataTodayIs();

            if (rows.length === 0) {
                return await interaction.reply("No user data available for the pointboard.");
            }

            // Format pointboard with asynchronous user fetching
            const pointboard = await Promise.all(rows.slice(0, 10).map(async (row, index) => {
                try {
                    const user = await client.users.fetch(row.user_id);
                    const username = user ? user.username : 'Unknown User';
                    return `${index + 1}. ${username}: ${row.points} points`;
                } catch (error) {
                    console.error("Error fetching user:", error);
                    return `${index + 1}. Unknown User: ${row.points} points`;
                }
            }));

            // Join the pointboard array into a single string
            const pointboardString = pointboard.join('\n');

            // Create and send the embed with the pointboard
            const pointboardEmbed = new EmbedBuilder()
                .setColor('#3F48CC')
                .setTitle('Pointboard')
                .setDescription(pointboardString)
                .setTimestamp();
            await interaction.reply({ embeds: [pointboardEmbed] });
            utils.logWithTime('Pointboard command executed.');
            utils.logToChannel('Pointboard command executed.',client)
        } catch (err) {
            console.error("Error fetching pointboard data:", err.message);
            await interaction.reply("An error occurred while fetching the pointboard.");
        }
    }
};
