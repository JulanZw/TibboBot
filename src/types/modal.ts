import { TextInputStyle, ModalSubmitInteraction } from 'discord.js';

/**
 * Represents a single input field within a Discord modal.
 *
 * @property name - The label text shown above the input field.
 * @property style - The type of input to display (single-line or multi-line).
 * @property customId - Unique identifier for this field within the modal.
 * @property placeholder - Optional placeholder text shown when the field is empty.
 * @property required - Whether this field is required to be filled out (defaults to true).
 * @property minLength - Minimum number of characters the input must contain.
 * @property maxLength - Maximum number of characters the input can contain.
 * @property value - Pre-filled value shown in the input field when the modal opens.
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
 *
 * @property id - The custom ID of the modal, used to match submissions.
 * @property dynamicIdUsage - Indicates whether this modal uses dynamic IDs.
 * @property title - The title displayed at the top of the modal window.
 * @property fields - The input `ModalField`'s displayed within the modal.
 * @property onSubmit - Handler function called when the modal is submitted.
 */
export type Modal = {
  /**
   * The custom ID of the modal, used to match submissions.
   * If {@link dynamicIdUsage} is `true`, this is treated as a base ID
   * and may be suffixed with dynamic values (e.g. `editReminderModal:123`).
   */
  id: string;
  /**
   * Indicates whether this modal is **ephemeral** — meaning it’s tied to specific
   * context or data from its creation (e.g. a user, reminder ID, or other state).
   *
   * When `true`, the modal entry is automatically removed from the registry after
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
