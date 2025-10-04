import { ActionRowBuilder, TextInputBuilder, ModalBuilder } from 'discord.js';

import { Modal } from './typesAndInterfaces.ts';

const modalRegister = new Map<string, Modal>();

export function buildAndRegisterModal(data: Modal): ModalBuilder {
  const modal = new ModalBuilder().setCustomId(data.id).setTitle(data.title);

  for (const field of data.fields) {
    const input = new TextInputBuilder()
      .setCustomId(field.customId)
      .setLabel(field.name)
      .setStyle(field.style)
      .setRequired(field.required ?? true);
    if (field.placeholder) input.setPlaceholder(field.placeholder);
    if (field.minLength) input.setMinLength(field.minLength);
    if (field.maxLength) input.setMaxLength(field.maxLength);
    if (field.value) input.setValue(field.value);
    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
    modal.addComponents(row);
  }
  modalRegister.set(data.id, data);

  return modal;
}

export function getModal(id: string) {
  return modalRegister.get(id);
}

export function removeModal(id: string) {
  return modalRegister.delete(id);
}
