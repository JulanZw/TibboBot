import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  ComponentType,
} from 'discord.js';

import { InteractionError } from '../classes/InteractionError.class.js';

import {
  createButton,
  createButtonsRow,
  createPaginationButtons,
} from './embeds.js';
import { safeReply } from './editAndReply.js';
import { TIMES_MILISECONDS } from './miliseconds.js';

export type PaginatedEmbedOptions<T> = {
  // Optional extra buttons
  extraButtons?: ReturnType<typeof createButton>[];
  // Optional timeout in ms, defualts to 2 minutes
  timeout?: number;

  // Handler for custom button clicks
  onCustomButton?: (
    action: string,
    index: number,
    items: T[],
  ) => Promise<{
    handled: boolean;
    newItems?: T[];
    stopCollector?: boolean;
  }>;
};

export class PaginatedEmbed<T> {
  private index = 0;
  private items: T[];
  private collector?: any;

  constructor(
    private interaction: ChatInputCommandInteraction,
    items: T[],
    private buildEmbed: (item: T, index: number, total: number) => any[],
    private options?: PaginatedEmbedOptions<T>,
  ) {
    this.items = items;
  }

  private buildButtons() {
    const paginationButtons = createPaginationButtons(
      this.index,
      this.items.length,
    );
    const extraButtons = this.options?.extraButtons ?? [];

    return [
      createButtonsRow(extraButtons, {
        buttons: paginationButtons,
        location: 'embrace',
      }),
    ];
  }

  async start() {
    await safeReply(
      this.interaction,
      '',
      false,
      this.buildEmbed(this.items[this.index], this.index, this.items.length),
      this.buildButtons(),
    );

    const msg = await this.interaction.fetchReply();
    this.collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: this.options?.timeout ?? TIMES_MILISECONDS.MINUTE * 2,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.collector.on('collect', async (btnInteraction: ButtonInteraction) => {
      if (btnInteraction.user.id !== this.interaction.user.id) {
        return await safeReply(
          btnInteraction,
          'You cannot use this button.',
          true,
        );
      }

      const action = btnInteraction.customId;

      // Handle custom buttons first
      if (this.options?.onCustomButton) {
        const result = await this.options.onCustomButton(
          action,
          this.index,
          this.items,
        );

        if (result.handled) {
          if (result.newItems) {
            this.items = result.newItems;
            this.index = Math.min(this.index, this.items.length - 1);

            if (this.items.length === 0 || result.stopCollector) {
              this.stop();
              return;
            }
          }

          // Don't update for confirmation dialogs
          if (action !== 'delete') {
            await btnInteraction.update({
              embeds: this.buildEmbed(
                this.items[this.index],
                this.index,
                this.items.length,
              ),
              components: this.buildButtons(),
            });
          }
          return;
        }
      }

      // Handle pagination
      switch (action) {
        case 'prev':
          this.index = Math.max(0, this.index - 1);
          break;
        case 'next':
          this.index = Math.min(this.items.length - 1, this.index + 1);
          break;
        default:
          return;
      }

      await btnInteraction.update({
        embeds: this.buildEmbed(
          this.items[this.index],
          this.index,
          this.items.length,
        ),
        components: this.buildButtons(),
      });
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.collector.on('end', async () => {
      try {
        await this.interaction.editReply({ components: [] });
      } catch (err: any) {
        throw new InteractionError(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          `Failed to clear components: ${err.message}`,
          this.interaction.id,
          'failed',
        );
      }
    });
  }

  // Manually stop if needed
  stop() {
    if (this.collector) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.collector.stop();
    }
  }

  // For custom logic
  getCurrentIndex() {
    return this.index;
  }

  // For custom logic
  getItems() {
    return this.items;
  }
}
