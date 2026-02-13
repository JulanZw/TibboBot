import { TextInputStyle, ModalSubmitInteraction } from 'discord.js';

/**
 * Represents a single input field within a Discord modal.
 */
export type ModalField = {
  /**
   * The label text shown above the input field.
   */
  name: string;
  /**
   * The type of input to display.
   * Use {@link TextInputStyle.Short} for a single-line field
   * or {@link TextInputStyle.Paragraph} for a multi-line field.
   */
  style: TextInputStyle;
  /**
   * Unique identifier for this field within the modal.
   * Used to retrieve the value in the `onSubmit` handler.
   */
  customId: string;
  /**
   * Optional placeholder text shown when the field is empty.
   */
  placeholder?: string;
  /**
   * Whether this field is required to be filled out.
   * Defaults to `true`.
   */
  required?: boolean;
  /**
   * Minimum number of characters the input must contain.
   */
  minLength?: number;
  /**
   * Maximum number of characters the input can contain.
   */
  maxLength?: number;
  /**
   * Pre-filled value shown in the input field when the modal opens.
   */
  value?: string;
};

/**
 * Represents a Discord modal dialog configuration.
 */
export type Modal = {
  /**
   * The custom ID of the modal, used to match submissions.
   *
   * When using dynamic IDs (e.g., `edit-reminder:123`), the ModalManager
   * will match based on the base ID before the colon.
   */
  id: string;

  /**
   * Indicates whether this modal is **ephemeral** — meaning it's tied to specific
   * context or data from its creation (e.g., a user, reminder ID, or other state).
   *
   * When `true`, the modal is automatically removed from the registry after
   * submission to prevent reuse or context leakage. This is typically used for
   * one-shot modals whose handlers depend on creation-time data.
   */
  ephemeral: boolean;

  /**
   * The title displayed at the top of the modal window.
   */
  title: string;

  /**
   * The input fields displayed within the modal.
   */
  fields: ModalField[];

  /**
   * Handler function called when the modal is submitted.
   * Provides the `ModalSubmitInteraction` to access input values
   * and reply to the user.
   */
  onSubmit: (interaction: ModalSubmitInteraction) => Promise<any>;
};
