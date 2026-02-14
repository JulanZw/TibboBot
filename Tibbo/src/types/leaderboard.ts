import { Client } from 'discord.js';

export interface LeaderboardRow {
  discordId: string;
  [key: string]: string | number | bigint;
}

export interface PrepareLeaderboardOptions {
  users: LeaderboardRow[];
  client: Client;
  number1Key: string;
  number2Key?: string;
  limit?: number;
  includeRankInUsername?: boolean;
  scope?: string;
}
