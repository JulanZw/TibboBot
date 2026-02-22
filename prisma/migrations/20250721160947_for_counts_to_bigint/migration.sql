/*
  Warnings:

  - You are about to drop the column `birthday` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `char_count` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `msg_count` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `points` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- CreateTable
CREATE TABLE "Birthday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "birthday" DATETIME NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Birthday_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("guildId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Birthday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "countChannelId" TEXT,
    "countNumber" INTEGER NOT NULL DEFAULT 0,
    "todayIsChannelId" TEXT,
    "birthdayChannelId" TEXT,
    "pointGiverId" TEXT,
    CONSTRAINT "Guild_pointGiverId_fkey" FOREIGN KEY ("pointGiverId") REFERENCES "User" ("discordId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Guild" ("birthdayChannelId", "countChannelId", "countNumber", "guildId", "pointGiverId", "todayIsChannelId") SELECT "birthdayChannelId", "countChannelId", "countNumber", "guildId", "pointGiverId", "todayIsChannelId" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE TABLE "new_User" (
    "discordId" TEXT NOT NULL PRIMARY KEY,
    "points" BIGINT NOT NULL,
    "char_count" BIGINT NOT NULL,
    "msg_count" BIGINT NOT NULL
);
INSERT INTO "new_User" ("char_count", "discordId", "msg_count", "points") SELECT "char_count", "discordId", "msg_count", "points" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Birthday_guildId_userId_key" ON "Birthday"("guildId", "userId");
