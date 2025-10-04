import { Command, Subcommand } from '../../types/commands.ts';
import { CooldownResult } from '../../types/cooldown.ts';

/**
 * A tracker with the command name as key and a map as value.
 *
 * Within the value map the userId is used as the key and the timestamp (in ms)
 * when the command can be used again as the value.
 *
 * So `Map<commandName, Map<userId, canBeUsedAgainAt>>`.
 */
const tracker: Map<string, Map<string, number>> = new Map();

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
    return {
      allowed: false,
      remaining: canBeUsedAgainAt - now,
    };
  }

  cooldownMap.set(userId, now + command.cooldown);

  return { allowed: true };
}
