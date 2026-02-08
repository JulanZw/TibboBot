/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatInputCommandInteraction } from 'discord.js';

import { Subcommand } from '../types/commands.ts';
import { commandBuilder } from '../utils/discord/commandBuilder.ts';
import { resetAllUserStats } from '../database/stats.ts';
import { safeReply } from '../utils/discord/editAndReply.ts';

const testServerId = process.env.TEST_SERVER_ID;

const devCommands = commandBuilder({
  name: 'dev',
  description: 'Dev.',
  subcommands: new Map<string, Subcommand>([
    [
      'dev',
      {
        name: 'dev',
        description:
          'Does whatever the dev wants it to do. Mainly used for debugging functions if needed, else its empty.',
        execute: async (interaction: ChatInputCommandInteraction) => {
          await resetAllUserStats();

          await safeReply(interaction,'command succesfully executed.');
        },
        guildOnly: false,
        permissionLevel: 'owner',
      },
    ],
  ]),
});

export default devCommands;
