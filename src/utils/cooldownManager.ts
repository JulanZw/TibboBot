import { Command, Subcommand } from './typesAndInterfaces';

/**
 * A tracker with the command name as key and a map as value.
 *
 * Within the value map the userId is used as the key and the timestamp (in ms)
 * when the command can be used again as the value.
 *
 * So `Map<commandName, Map<userId, canBeUsedAgainAt>>`.
 */
const tracker: Map<string, Map<string, number>> = new Map();

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

/**
 * Checks whether a user can run a given command considering its cooldown.
 *
 * If the command has no cooldown, it is always allowed.
 * If the user is on cooldown, returns how long they still need to wait.
 *
 * This function also automatically cleans up expired cooldowns.
 *
 * @param command The command being checked.
 * @param userId The ID of the user executing the command.
 * @returns A CooldownResult with `allowed` and optional `remaining` time.
 */
export function checkCooldown(
  command: Command | Subcommand,
  userId: string,
): CooldownResult {
  if (!command.cooldown) return { allowed: true };

  const now = Date.now();
  let cooldownMap = tracker.get(command.name);

  // Initialize cooldown map for this command if it doesn't exist
  if (!cooldownMap) {
    cooldownMap = new Map();
    tracker.set(command.name, cooldownMap);
  }

  // Clean up expired entries
  for (const [id, expiry] of cooldownMap) {
    if (expiry <= now) {
      cooldownMap.delete(id);
    }
  }

  const canBeUsedAgainAt = cooldownMap.get(userId);

  if (canBeUsedAgainAt && now < canBeUsedAgainAt) {
    // Still on cooldown
    return {
      allowed: false,
      remaining: canBeUsedAgainAt - now,
    };
  }

  // Set next allowed usage
  cooldownMap.set(userId, now + command.cooldown);

  return { allowed: true };
}

/**
 * Formats a duration in milliseconds into a human-readable string.
 * Examples:
 *  - 4200 -> "4s"
 *  - 65000 -> "1m 5s"
 *  - 3723000 -> "1h 2m 3s"
 *
 * @param ms Duration in milliseconds
 * @returns A formatted string
 */
export function formatDuration(ms: number): string {
  let seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}
