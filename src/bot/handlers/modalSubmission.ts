import { ModalSubmitInteraction } from 'discord.js';

import { getModal, removeModal } from '../utils/discord/modalRegistry.ts';

export async function handleModal(interaction: ModalSubmitInteraction) {
  const modal = getModal(interaction.customId);
  if (modal) {
    await modal.onSubmit(interaction);
    if (modal.ephemeral) removeModal(modal.id);

    return;
  }
}
