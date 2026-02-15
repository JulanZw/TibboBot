import wol from 'wol';
import { ChatInputCommandInteraction } from 'discord.js';
import { safeReply } from '@julanzw/ttoolbox-discord-framework';

import { BotCommand } from '../impl/BotCommand.class.ts';
import { logger } from '../index.ts';

const scope = 'magic';

export class MagicCommand extends BotCommand {
  name = 'magic';
  description = 'does some magic (bot owner only)';
  guildOnly = false;
  permissionLevel = 'owner' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!process.env.WOL_MAC || !process.env.WOL_IP) {
      logger.error(
        'Cannot execute WOL because MAC or IP is not set',
        scope,
        true,
      );
      await safeReply(interaction, 'IP or MAC has not been set');
      return;
    }

    const succes = await wol.wake(process.env.WOL_MAC, {
      address: process.env.WOL_IP,
      port: 9,
    });
    await safeReply(interaction, succes ? 'magic...' : 'magic failed... :(');
    return;
  }
}
