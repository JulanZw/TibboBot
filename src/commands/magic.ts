import wol from 'wol';

import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';

export const wolCommand = commandBuilder(
  'magic',
  'does some magic (bot owner only)',
  async (interaction) => {
    if (!process.env.WOL_MAC || !process.env.WOL_IP) {
      logWithTime(
        'Cannot execute WOL because MAC or IP is not set',
        'error',
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
  false,
  'owner',
);
