import {
  APIEmbedField,
  ColorResolvable,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  ActionRowBuilder,
} from 'discord.js';

import { STANDARD_COLOR } from './globals';
import { ButtonType } from './typesAndInterfaces';

/**
 * Util function for building an embed
 *
 * @param title - The title of the embed
 * @param fields - The fields of the embed
 * @param description - The description of the embed, optional
 * @param footer - The footer of the embed, optional
 * @param timestamp - If the embed should have a timestamp, defaults to false
 * @param color - The color of the embed, defaults to STANDARD_COLOR
 * @param customize - A function to customize the embed further, defaults to no customization
 *
 * @returns An EmbedBuilder instance with the specified properties
 */
export function embedBuilder({
  title,
  fields,
  description,
  footer,
  timestamp = false,
  color = STANDARD_COLOR,
  customize = (e) => e,
}: {
  title: string;
  fields?: APIEmbedField[];
  description?: string;
  footer?: string;
  timestamp?: boolean;
  color?: ColorResolvable;
  customize?: (embed: EmbedBuilder) => EmbedBuilder;
}): EmbedBuilder {
  let embed = new EmbedBuilder().setTitle(title).setColor(color);

  if (fields && fields.length > 0) embed = embed.setFields(fields);
  if (description) embed = embed.setDescription(description);
  if (footer) embed = embed.setFooter({ text: footer });
  if (timestamp) embed = embed.setTimestamp();

  return customize(embed);
}

/**
 * Creates a single button based on its type and config.
 *
 * @param type - The `ButtonType` of the button (prev, next, edit, delete)
 * @param actionId - The base action ID for the button
 * @param disabled - Whether the button should be disabled, defaults to false
 * @param label - Optional label for the button, defaults to type-based label
 * @param style - Optional style for the button, defaults to secondary
 *
 * @return A ButtonBuilder instance configured with the specified properties
 */
function createButton({
  type,
  disabled = false,
  label,
  style,
  customId,
}: {
  type: ButtonType;
  disabled?: boolean;
  label?: string;
  style?: ButtonStyle;
  customId?: string;
}): ButtonBuilder {
  const button = new ButtonBuilder()
    .setCustomId(customId ?? `${type}`)
    .setDisabled(disabled);

  switch (type) {
    case 'prev':
      return button
        .setLabel(label ?? 'Previous')
        .setStyle(ButtonStyle.Secondary);
    case 'next':
      return button.setLabel(label ?? 'Next').setStyle(ButtonStyle.Secondary);
    case 'edit':
      return button.setLabel(label ?? 'Edit').setStyle(ButtonStyle.Primary);
    case 'delete':
      return button.setLabel(label ?? 'Delete').setStyle(ButtonStyle.Danger);
    default:
      return button
        .setLabel(label ?? 'Unknown')
        .setStyle(style ?? ButtonStyle.Secondary);
  }
}

/**
 * Creates one action row of standard buttons with optional auto-disable logic.
 *
 * @param index - The current index of the item being paginated
 * @param total - The total number of pages
 * @param types - The types of buttons to include, defaults to all
 *
 * @returns An ActionRowBuilder containing the buttons
 */
export function createButtonsRow(
  index: number,
  total: number,
  types: ButtonType[] = ['prev', 'edit', 'delete', 'next'],
): ActionRowBuilder<ButtonBuilder> {
  const buttons = types.map((type) =>
    createButton({
      type,
      disabled:
        (type === 'prev' && index === 0) ||
        (type === 'next' && index === total - 1),
    }),
  );

  return new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons);
}
