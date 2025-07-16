const { SlashCommandBuilder } = require('@discordjs/builders');
const utils = require('../utils');
const wol = require('wol');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('magic')
        .setDescription('does some magic (bot owner only)'),
    name: 'magic',
    description: 'does some magic (bot owner only)',

    async execute(interaction) {
      if(interaction.user.id === '486523861874245642'){
        await interaction.reply('magic');
        wol.wake('BC:FC:E7:06:D8:12', {
          address: '192.168.0.255',
          port: 9
        }, function(error) {
          if (error) {
            utils.logWithTime('Error:', error);
          } else {
            utils.logWithTime('WOL command executed.');
          }
        });
      }else{
        await interaction.reply('You didnt say the magic word...');
        utils.logWithTime('WOL command executed by someone else: .', interaction.user.username);
      }
    }
};
