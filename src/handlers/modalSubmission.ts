import { ModalSubmitInteraction } from 'discord.js';

import { modalManager } from '../utils/globals.ts';

export async function handleModal(interaction: ModalSubmitInteraction) {
  if (interaction.isModalSubmit()) {
    await modalManager.handleSubmit(interaction);
  }
}
