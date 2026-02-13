import {
  CommandInteraction,
  TextInputStyle,
  ModalSubmitInteraction,
  ButtonInteraction,
} from 'discord.js';

import { safeReply } from '../../core/utils/editAndReply.ts';

import { modalManager } from './globals.ts';

/**
 * Sends a modal asking the user to type "CONFIRM" before proceeding.
 * @param interaction The command interaction to respond to.
 * @param customId Unique customId for the modal.
 * @param onSubmit Function to call when the modal is submitted.
 */
export async function showConfirmModal(
  interaction: CommandInteraction | ButtonInteraction,
  customId: string,
  onSubmit: (interaction: ModalSubmitInteraction) => Promise<any>,
) {
  const modal = modalManager.buildAndRegister({
    id: customId,
    title: 'Confirm Action',
    ephemeral: false,
    fields: [
      {
        name: 'Type "CONFIRM" to continue. CANT BE REVERTED',
        style: TextInputStyle.Short,
        customId: 'confirmation_input',
        placeholder: 'CONFIRM',
        required: true,
      },
    ],
    onSubmit,
  });

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
