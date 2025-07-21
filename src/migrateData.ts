import * as Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const oldDb = new Database('ZWutils.db');

interface UserCountsRow {
  user_id: string;
  char_count?: number;
  msg_count?: number;
}

interface TodayIsRow {
  user_id: string;
  points?: number;
}

// Synchronous function to get all rows for a query
function getAllRows<T = any>(query: string): T[] {
  return oldDb.prepare(query).all() as T[];
}

async function migrate() {
  try {
    console.log('Starting migration...');

    const userCounts = getAllRows<UserCountsRow>('SELECT * FROM user_counts');
    console.log(`Migrating ${userCounts.length} user_counts...`);

    for (const row of userCounts) {
      await prisma.user.upsert({
        where: { discordId: row.user_id },
        update: {
          char_count: row.char_count ?? 0,
          msg_count: row.msg_count ?? 0,
        },
        create: {
          discordId: row.user_id,
          char_count: row.char_count ?? 0,
          msg_count: row.msg_count ?? 0,
          points: 0,
        },
      });
    }

    const points = getAllRows<TodayIsRow>('SELECT * FROM todayis');
    console.log(`Updating points for ${points.length} users...`);

    for (const row of points) {
      await prisma.user.upsert({
        where: { discordId: row.user_id },
        update: {
          points: row.points ?? 0,
        },
        create: {
          discordId: row.user_id,
          points: row.points ?? 0,
          char_count: 0,
          msg_count: 0,
        },
      });
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await prisma.$disconnect();
    oldDb.close();
  }
}

migrate();