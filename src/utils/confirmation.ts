import {
  CommandInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ModalSubmitInteraction,
  ButtonInteraction,
} from 'discord.js';

import { safeReply } from './general.ts';

/**
 * Sends a modal asking the user to type "confirm" before proceeding.
 * @param interaction The command interaction to respond to.
 * @param customId Unique customId for the modal.
 */
export async function showConfirmModal(
  interaction: CommandInteraction | ButtonInteraction,
  customId: string,
) {
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('Confirm Purge');

  const input = new TextInputBuilder()
    .setCustomId('confirmation_input')
    .setLabel('Type "confirm" to continue. CANT BE REVERTED')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('CONFIRM')
    .setRequired(true);

  const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  modal.addComponents(row);

  await interaction.showModal(modal);
}

/**
 * Handles the modal submission and checks if user typed "confirm".
 * @param modalInteraction The ModalSubmitInteraction to check.
 * @returns true if confirmed, false otherwise.
 */
export async function handleConfirmModal(
  modalInteraction: ModalSubmitInteraction,
): Promise<boolean> {
  const value = modalInteraction.fields.getTextInputValue('confirmation_input');

  if (value === 'CONFIRM') {
    await safeReply(
      modalInteraction,
      '✅ Confirmation received, proceeding...',
      true,
    );
    return true;
  } else {
    await safeReply(
      modalInteraction,
      '❌ Confirmation failed. Type `confirm` exactly.',
      true,
    );
    return false;
  }
}
