import { Interaction } from 'discord.js';

import { ensureGuildExistance } from '../database/guild.ts';

import { executeCommand } from './commandExecution.ts';
import { handleModal } from './modalSubmission.ts';

export async function handleInteractionCreation(interaction: Interaction) {
  if (interaction.guildId) {
    await ensureGuildExistance(interaction.guildId);
  }

  if (interaction.isChatInputCommand()) {
    await executeCommand(interaction);
  } else if (interaction.isModalSubmit()) {
    await handleModal(interaction);
  }
}
