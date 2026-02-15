/**
 * Custom error for interaction failures
 */
export class InteractionError extends Error {
  constructor(
    message: string,
    public readonly interactionId: string,
    public readonly reason: 'expired' | 'failed',
  ) {
    super(message);
    this.name = 'InteractionError';
  }
}
