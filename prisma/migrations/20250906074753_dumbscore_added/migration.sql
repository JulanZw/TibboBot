-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "countChannelId" TEXT,
    "countNumber" INTEGER NOT NULL DEFAULT 0,
    "highestNumber" INTEGER NOT NULL DEFAULT 0,
    "lastCountUser" TEXT,
    "todayIsChannelId" TEXT,
    "birthdayChannelId" TEXT,
    "dumbScore" INTEGER NOT NULL DEFAULT 0,
    "pointGiverId" TEXT,
    CONSTRAINT "Guild_pointGiverId_fkey" FOREIGN KEY ("pointGiverId") REFERENCES "User" ("discordId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guild" ("birthdayChannelId", "countChannelId", "countNumber", "guildId", "highestNumber", "lastCountUser", "pointGiverId", "todayIsChannelId") SELECT "birthdayChannelId", "countChannelId", "countNumber", "guildId", "highestNumber", "lastCountUser", "pointGiverId", "todayIsChannelId" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
