import wol from 'wol';

import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { ChatInputCommandInteraction } from 'discord.js';

const scope = 'magic';

export const wolCommand = commandBuilder({
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
