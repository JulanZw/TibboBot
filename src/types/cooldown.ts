/**
 * Represents the result of a cooldown check for a command.
 *
 * @property allowed - Indicates if the user is permitted to execute the command at this time.
 * @property remaining - If not allowed, specifies the remaining cooldown time in milliseconds before the command can be used again.
 */
export interface CooldownResult {
  /**
   * Whether the user is allowed to run the command right now.
   */
  allowed: boolean;
  /**
   * If not allowed, the time (in ms) until the user can use the command again.
   */
  remaining?: number;
}
