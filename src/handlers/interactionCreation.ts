import { Interaction } from 'discord.js';

import { ensureGuildExistance } from '../database/guild';

import { executeCommand } from './commandExecution';
import { handleModal } from './modalSubmission';

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
