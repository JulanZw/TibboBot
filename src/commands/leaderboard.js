const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const database = require('../database');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows the top users on the leaderboard.'),

    name: 'leaderboard',
    description: 'Shows the top users on the leaderboard.',

    async execute(interaction, client) {
        try {
            const rows = await database.getAllUserData();

            if (rows.length === 0) {
                return await interaction.reply("No user data available for the leaderboard.");
            }

            // Format leaderboard with asynchronous user fetching
            const leaderboard = await Promise.all(rows.slice(0, 10).map(async (row, index) => {
                try {
                    const user = await client.users.fetch(row.user_id);
                    const username = user ? user.username : 'Unknown User';
                    return `${index + 1}. ${username}: ${row.msg_count} messages, ${row.char_count} characters`;
                } catch (error) {
                    console.error("Error fetching user:", error);
                    return `${index + 1}. Unknown User: ${row.msg_count} messages, ${row.char_count} characters`;
                }
            }));

            // Join the leaderboard array into a single string
            const leaderboardString = leaderboard.join('\n');

            // Create and send the embed with the leaderboard
            const leaderboardEmbed = new EmbedBuilder()
                .setColor('#3F48CC')
                .setTitle('Leaderboard')
                .setDescription(leaderboardString)
                .setTimestamp();
            await interaction.reply({ embeds: [leaderboardEmbed] });
            utils.logWithTime('Leaderboard command executed.');
            utils.logToChannel('Leaderboard command executed.',client)
        } catch (err) {
            console.error("Error fetching leaderboard data:", err.message);
            await interaction.reply("An error occurred while fetching the leaderboard.");
        }
    }
};
