const { SlashCommandBuilder } = require('@discordjs/builders');
const database = require('../database');
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Displays the message count for a specified user.')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to check')
                .setRequired(true)
        ),

    name: 'messages',
    description: 'Displays your message count.',

    async execute(interaction,client) {
        const targetUser = interaction.options.getUser('target');

        try {
            const row = await database.getUserData(targetUser.id);
            const username = targetUser.username;

            if (row) {
                await interaction.reply(`User ${username} has sent ${row.char_count} characters in ${row.msg_count} message(s).`);
                utils.logWithTime(`User ${username}'s stats: char_count = ${row.char_count}, msg_count = ${row.msg_count}`);
                utils.logToChannel(`User ${username}'s stats: char_count = ${row.char_count}, msg_count = ${row.msg_count}`,client);
            } else {
                await interaction.reply(`User ${username} has not sent any messages yet.`);
                utils.logWithTime(`User ${username} has no message data.`);
                utils.logWithTime(`User ${username} has no message data.`,client);
            }
        } catch (err) {
            console.error("Error fetching user data:", err.message);
            await interaction.reply("An error occurred while fetching user data.");
        }
    }
};
