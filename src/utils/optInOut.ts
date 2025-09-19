import { getOptedOutUsers, updateOptOutChoice } from '../database/user';

const optedOutUsers = new Set<string>();

export async function optOut(userId: string) {
  optedOutUsers.add(userId);
  return await updateOptOutChoice(userId, true);
}

export async function optIn(userId: string) {
  optedOutUsers.delete(userId);
  return await updateOptOutChoice(userId, false);
}

export async function loadOptedOutUsers() {
  optedOutUsers.clear();
  (await getOptedOutUsers()).forEach((user) =>
    optedOutUsers.add(user.discordId),
  );
}

export function hasOptedOut(userId: string) {
  return optedOutUsers.has(userId);
}
