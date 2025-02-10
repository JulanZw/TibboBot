const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require("discord.js");
const utils = require('../utils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cat')
        .setDescription('Sends a random cat picture.'),

    name: 'cat',
    description: 'Sends a random cat picture.',

    async execute(interaction,client) {
        try {
            const response = await fetch('https://api.thecatapi.com/v1/images/search');
            const data = await response.json();
            const imageUrl = data[0].url;

            const catEmbed = new EmbedBuilder()
                .setColor('#3F48CC')
                .setTitle("Here's a cat for you!")
                .setImage(imageUrl)
                .setTimestamp();

            await interaction.reply({ embeds: [catEmbed] });
        } catch (error) {
            console.error('Error fetching cat image:', error);
            await interaction.reply('Sorry, I couldn\'t fetch a cat image at the moment.');
        }

        utils.logWithTime('Cat command executed.');
        utils.logToChannel(`Cat command executed`,client)
    }
};
