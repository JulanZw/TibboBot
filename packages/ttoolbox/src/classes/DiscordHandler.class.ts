/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-misused-promises */
import {
  Client,
  Events,
  Interaction,
  Message,
  MessageReaction,
  PartialMessageReaction,
  PartialUser,
  User,
  OmitPartialGroupDMChannel,
  PartialMessage,
  Awaitable,
  ClientEvents,
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

import { TToolboxLogger } from '../utils/TToolboxLogger.class.js';

/**
 * Abstract base class for Discord bot event handling.
 *
 * Provides a structured way to handle Discord.js events with automatic setup,
 * error handling, and graceful shutdown capabilities. Child classes should
 * override the protected handler methods for the events they want to handle.
 *
 * @example
 * ```typescript
 * class MyBotHandler extends DiscordHandler {
 *   protected async handleInteractionCreation(interaction: Interaction) {
 *     if (interaction.isChatInputCommand()) {
 *       await executeCommand(interaction);
 *     }
 *   }
 * }
 *
 * const handler = new MyBotHandler(client);
 * handler.setupErrorHandlers();
 * await handler.setupOtherHandlers();
 * ```
 */
export abstract class DiscordHandler {
  /** The Discord.js client instance */
  client: Client;

  /** The Prisma database client instance, Optional */
  private prisma?: PrismaClient;

  /** The TToolboxLogger instance used for logging */
  private logger: TToolboxLogger;

  /**
   * Creates a new DiscordHandler instance.
   *
   * @param client - The Discord.js client instance
   * @param prisma - The Prisma database client instance
   */
  constructor(client: Client, logger: TToolboxLogger, prisma?: PrismaClient) {
    this.client = client;
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Sets up process-level error handlers and graceful shutdown handlers.
   *
   * This method registers handlers for:
   * - Uncaught exceptions (exits process)
   * - Unhandled promise rejections (logs warning)
   * - SIGINT and SIGTERM signals (graceful shutdown)
   *
   * Should be called once during bot initialization.
   */
  setupErrorHandlers() {
    process.on('uncaughtException', (err: any) => {
      this.logger.error(`Uncaught Exception: ${err}`, 'errorhandler', true);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any) => {
      this.logger.warn(`Unhandled Rejection: ${reason}`, 'errorhandler');
    });

    process.on('SIGINT', () => void this.gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => void this.gracefulShutdown('SIGTERM'));

    this.logger.info('Error handlers set up.', 'startup');
  }

  /**
   * Handles graceful shutdown of the bot.
   *
   * Properly cleans up resources by:
   * 1. Destroying the Discord client connection
   * 2. Disconnecting from the Prisma database
   * 3. Exiting the process
   *
   * @param signal - The signal that triggered the shutdown (e.g., 'SIGINT', 'SIGTERM')
   * @private
   */
  private async gracefulShutdown(signal: string) {
    const scope = 'shutdown';
    this.logger.info(`${signal} received. Cleaning up...`, scope);

    try {
      if (this.client.isReady()) {
        this.logger.info(`Destroying Discord client...`, scope);
        await this.client.destroy();
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to destroy Discord client: ${err}`,
        scope,
        true,
      );
    }

    if (this.prisma) {
      try {
        this.logger.info(`Disconnecting Prisma...`, scope);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await this.prisma.$disconnect();
      } catch (err: any) {
        this.logger.error(`Failed to disconnect Prisma: ${err}`, scope, true);
      }
    }

    process.exit(0);
  }

  /**
   * Automatically sets up Discord event handlers for all implemented handler methods.
   *
   * This method checks which handler methods have been overridden in the child class
   * and only registers event listeners for those handlers. This allows child classes
   * to selectively implement only the events they need.
   *
   * Should be called once during bot initialization, after setupErrorHandlers().
   *
   * @example
   * ```typescript
   * const handler = new MyBotHandler(client, prisma);
   * handler.setupErrorHandlers();
   * await handler.setupOtherHandlers();
   * ```
   */
  async setupOtherHandlers() {
    const baseClass = Object.getPrototypeOf(
      this.constructor,
    ) as typeof DiscordHandler;

    if (
      this.handleMessageCreation !== baseClass.prototype.handleMessageCreation
    ) {
      await this.setupMessageCreateHandler();
    }

    if (
      this.handleInteractionCreation !==
      baseClass.prototype.handleInteractionCreation
    ) {
      await this.setupInteractionCreateHandler();
    }

    if (this.handleReactionAdded !== baseClass.prototype.handleReactionAdded) {
      await this.setupMessageReactionAddHandler();
    }

    if (
      this.handleReactionRemoval !== baseClass.prototype.handleReactionRemoval
    ) {
      await this.setupMessageReactionRemoveHandler();
    }

    if (
      this.handleMessageDeletion !== baseClass.prototype.handleMessageDeletion
    ) {
      await this.setupMessageDeleteHandler();
    }
  }

  /**
   * Sets up the Discord MessageCreate event listener.
   * @private
   */
  private async setupMessageCreateHandler() {
    this.client.on(Events.MessageCreate, async (message: Message) => {
      await this.handleMessageCreation(message);
    });
  }

  /**
   * Handles the MessageCreate event.
   *
   * Override this method to implement custom message handling logic.
   * This is called whenever a message is created in any channel the bot can see.
   *
   * @param message - The message that was created
   *
   * @example
   * ```typescript
   * protected async handleMessageCreation(message: Message) {
   *   if (message.content.startsWith('!ping')) {
   *     await message.reply('Pong!');
   *   }
   * }
   * ```
   */
  protected abstract handleMessageCreation(
    message: Message<boolean>,
  ): Promise<void>;

  /**
   * Sets up the Discord InteractionCreate event listener.
   * @private
   */
  private async setupInteractionCreateHandler() {
    this.client.on(
      Events.InteractionCreate,
      async (interaction: Interaction) => {
        await this.handleInteractionCreation(interaction);
      },
    );
  }

  /**
   * Handles the InteractionCreate event.
   *
   * Override this method to implement custom interaction handling logic.
   * This is called for all types of interactions: slash commands, buttons,
   * select menus, modals, etc.
   *
   * @param interaction - The interaction that was created
   *
   * @example
   * ```typescript
   * protected async handleInteractionCreation(interaction: Interaction) {
   *   if (interaction.isChatInputCommand()) {
   *     await commandManager.executeCommand(interaction.commandName, interaction, client);
   *   }
   *   if (interaction.isButton()) {
   *     await handleButtonClick(interaction);
   *   }
   * }
   * ```
   */
  protected abstract handleInteractionCreation(
    interaction: Interaction,
  ): Promise<void>;

  /**
   * Sets up the Discord MessageReactionAdd event listener.
   * @private
   */
  private async setupMessageReactionAddHandler() {
    this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
      await this.handleReactionAdded(reaction, user);
    });
  }

  /**
   * Handles the MessageReactionAdd event.
   *
   * Override this method to implement custom reaction handling logic.
   * This is called whenever a user adds a reaction to a message.
   *
   * @param reaction - The reaction that was added (may be partial)
   * @param user - The user who added the reaction (may be partial)
   *
   * @example
   * ```typescript
   * protected async handleReactionAdded(reaction: MessageReaction, user: User) {
   *   if (reaction.emoji.name === '⭐' && reaction.count >= 5) {
   *     await addToStarboard(reaction.message);
   *   }
   * }
   * ```
   */
  protected abstract handleReactionAdded(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void>;

  /**
   * Sets up the Discord MessageReactionRemove event listener.
   * @private
   */
  private async setupMessageReactionRemoveHandler() {
    this.client.on(Events.MessageReactionRemove, async (reaction, user) => {
      await this.handleReactionRemoval(reaction, user);
    });
  }

  /**
   * Handles the MessageReactionRemove event.
   *
   * Override this method to implement custom reaction removal handling logic.
   * This is called whenever a user removes a reaction from a message.
   *
   * @param reaction - The reaction that was removed (may be partial)
   * @param user - The user who removed the reaction (may be partial)
   *
   * @example
   * ```typescript
   * protected async handleReactionRemoval(reaction: MessageReaction, user: User) {
   *   if (reaction.emoji.name === '⭐' && reaction.count < 5) {
   *     await removeFromStarboard(reaction.message);
   *   }
   * }
   * ```
   */
  protected abstract handleReactionRemoval(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
  ): Promise<void>;

  /**
   * Sets up the Discord MessageDelete event listener.
   * @private
   */
  private async setupMessageDeleteHandler() {
    this.client.on(Events.MessageDelete, async (message) => {
      await this.handleMessageDeletion(message);
    });
  }

  /**
   * Handles the MessageDelete event.
   *
   * Override this method to implement custom message deletion handling logic.
   * This is called whenever a message is deleted.
   *
   * @param message - The message that was deleted (may be partial)
   *
   * @example
   * ```typescript
   * protected async handleMessageDeletion(message: Message) {
   *   await logDeletedMessage(message);
   * }
   * ```
   */
  protected abstract handleMessageDeletion(
    message: OmitPartialGroupDMChannel<Message<boolean> | PartialMessage>,
  ): Promise<void>;

  /**
   * Register a custom event handler for any Discord.js event not covered by the base handlers.
   *
   * This allows you to listen to any Discord.js event beyond the standard ones
   * (MessageCreate, InteractionCreate, etc.) that are built into the base class.
   *
   * @param event - The Discord.js event name (e.g., Events.GuildMemberAdd)
   * @param handler - The handler function to call when the event fires
   *
   * @example
   * ```typescript
   * this.registerCustomHandler(Events.GuildMemberAdd, async (member) => {
   *   await sendWelcomeMessage(member);
   * });
   * ```
   */
  protected registerCustomHandler<K extends keyof ClientEvents>(
    event: K,
    handler: (...args: ClientEvents[K]) => Awaitable<void>,
  ): void {
    this.client.on(event, handler);
    this.logger.info(
      `Registered custom handler for event: ${event}`,
      'handler',
    );
  }

  /**
   * Register multiple custom event handlers at once.
   *
   * Convenience method for registering several custom event handlers in a single call.
   *
   * @param handlers - Array of event/handler pairs to register
   *
   * @example
   * ```typescript
   * this.registerCustomHandlers([
   *   {
   *     event: Events.GuildMemberAdd,
   *     handler: async (member) => await sendWelcomeMessage(member),
   *   },
   *   {
   *     event: Events.VoiceStateUpdate,
   *     handler: async (oldState, newState) => await handleVoiceChange(oldState, newState),
   *   },
   * ]);
   * ```
   */
  protected registerCustomHandlers(
    handlers: Array<{
      event: keyof ClientEvents;
      handler: (...args: any[]) => Awaitable<void>;
    }>,
  ): void {
    for (const { event, handler } of handlers) {
      this.registerCustomHandler(event as any, handler);
    }
  }
}
