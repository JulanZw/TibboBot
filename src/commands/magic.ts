import wol from 'wol';
import { ChatInputCommandInteraction } from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general.ts';
import { logWithTime } from '../utils/logging.ts';

const scope = 'magic';

const wolCommand = commandBuilder({
  name: 'magic',
  description: 'does some magic (bot owner only)',
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!process.env.WOL_MAC || !process.env.WOL_IP) {
      logWithTime(
        'Cannot execute WOL because MAC or IP is not set',
        'error',
        scope,
        true,
      );
      return await safeReply(interaction, 'IP or MAC has not been set');
    }

    const succes = await wol.wake(process.env.WOL_MAC, {
      address: process.env.WOL_IP,
      port: 9,
    });
    return await safeReply(
      interaction,
      succes ? 'magic...' : 'magic failed... :(',
    );
  },
  guildOnly: false,
  permissionLevel: 'owner',
});

export default wolCommand;
