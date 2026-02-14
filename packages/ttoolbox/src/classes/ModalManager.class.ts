// core/utils/ModalManager.js
import {
  ActionRowBuilder,
  TextInputBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
} from 'discord.js';

import { Modal } from '../types/modal.js';

/**
 * Manages modal creation, registration, and submission handling.
 *
 * Provides a centralized way to create and track modals throughout the bot.
 * Modals can be registered with their submission handlers and automatically
 * cleaned up after use if marked as ephemeral.
 *
 * @example
 * ```typescript
 * const modalManager = new ModalManager();
 *
 * // Create and register a modal
 * const modal = modalManager.buildAndRegister({
 *   id: 'feedback-modal',
 *   title: 'Submit Feedback',
 *   ephemeral: true,
 *   fields: [
 *     {
 *       customId: 'message',
 *       name: 'Your Feedback',
 *       style: TextInputStyle.Paragraph,
 *       required: true,
 *     }
 *   ],
 *   onSubmit: async (interaction) => {
 *     const feedback = interaction.fields.getTextInputValue('message');
 *     await interaction.reply('Thank you for your feedback!');
 *   }
 * });
 *
 * await interaction.showModal(modal);
 * ```
 */
export class ModalManager {
  private modals = new Map<string, Modal>();

  /**
   * Builds a Discord ModalBuilder and registers the modal for submission handling.
   *
   * Creates a modal with the specified fields and registers it so that when
   * a user submits it, the onSubmit handler will be called.
   *
   * @param data - The modal configuration including fields and submission handler
   * @returns A ModalBuilder ready to be shown to the user
   *
   * @example
   * ```typescript
   * const modal = modalManager.buildAndRegister({
   *   id: 'edit-reminder',
   *   title: 'Edit Reminder',
   *   ephemeral: true,
   *   fields: [
   *     {
   *       customId: 'message',
   *       name: 'Reminder Message',
   *       style: TextInputStyle.Short,
   *       required: true,
   *       value: existingMessage,
   *     }
   *   ],
   *   onSubmit: async (interaction) => {
   *     const newMessage = interaction.fields.getTextInputValue('message');
   *     await updateReminder(id, newMessage);
   *   }
   * });
   *
   * await buttonInteraction.showModal(modal);
   * ```
   */
  buildAndRegister(data: Modal): ModalBuilder {
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

    this.modals.set(data.id, data);
    return modal;
  }

  /**
   * Retrieves a registered modal by its ID.
   *
   * Supports dynamic IDs - if the exact ID isn't found, attempts to match
   * using the base ID (before the first colon). This allows for modals with
   * dynamic suffixes like "edit-reminder:123".
   *
   * @param id - The modal ID to look up
   * @returns The modal configuration, or undefined if not found
   *
   * @example
   * ```typescript
   * // Register with base ID
   * modalManager.buildAndRegister({ id: 'edit-reminder', ... });
   *
   * // Can retrieve with dynamic ID
   * const modal = modalManager.get('edit-reminder:123'); // Works!
   * ```
   */
  get(id: string): Modal | undefined {
    // Try exact match first
    const modal = this.modals.get(id);
    if (modal) return modal;

    // Try base ID (before colon) for dynamic IDs
    const baseId = id.split(':')[0];
    return this.modals.get(baseId);
  }

  /**
   * Removes a modal from the registry.
   *
   * Useful for cleaning up ephemeral modals after they've been submitted,
   * or for unregistering modals that are no longer needed.
   *
   * @param id - The modal ID to remove
   * @returns true if the modal was removed, false if it didn't exist
   *
   * @example
   * ```typescript
   * // Clean up after submission
   * await modalManager.handleSubmit(interaction);
   * modalManager.remove(interaction.customId); // If ephemeral
   * ```
   */
  remove(id: string): boolean {
    return this.modals.delete(id);
  }

  /**
   * Handles a modal submission by calling the registered onSubmit handler.
   *
   * Looks up the modal by ID, calls its onSubmit handler, and automatically
   * removes ephemeral modals from the registry after submission.
   *
   * @param interaction - The modal submit interaction
   * @throws {Error} If no modal is found for the interaction's custom ID
   *
   * @example
   * ```typescript
   * // In your interaction handler
   * client.on('interactionCreate', async (interaction) => {
   *   if (interaction.isModalSubmit()) {
   *     await modalManager.handleSubmit(interaction);
   *   }
   * });
   * ```
   */
  async handleSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const modal = this.get(interaction.customId);

    if (!modal) {
      throw new Error(`Modal not found: ${interaction.customId}`);
    }

    await modal.onSubmit(interaction);

    // Clean up ephemeral modals
    if (modal.ephemeral) {
      this.remove(interaction.customId);
    }
  }

  /**
   * Checks if a modal with the given ID is registered.
   *
   * @param id - The modal ID to check
   * @returns true if the modal exists in the registry
   */
  has(id: string): boolean {
    return this.modals.has(id) || this.modals.has(id.split(':')[0]);
  }

  /**
   * Clears all registered modals from the registry.
   *
   * Useful for cleanup during bot shutdown or for testing.
   */
  clear(): void {
    this.modals.clear();
  }

  /**
   * Gets the total number of registered modals.
   *
   * @returns The count of modals in the registry
   */
  get size(): number {
    return this.modals.size;
  }

  /**
   * Gets all registered modal IDs.
   *
   * @returns Array of modal IDs currently in the registry
   */
  getModalIds(): string[] {
    return Array.from(this.modals.keys());
  }
}
