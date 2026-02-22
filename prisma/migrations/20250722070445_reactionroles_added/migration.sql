/*
  Warnings:

  - The primary key for the `Birthday` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Birthday` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "ReactionRoles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "guildId" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Birthday" (
    "birthday" DATETIME NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Birthday_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("guildId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Birthday_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Birthday" ("birthday", "guildId", "userId") SELECT "birthday", "guildId", "userId" FROM "Birthday";
DROP TABLE "Birthday";
ALTER TABLE "new_Birthday" RENAME TO "Birthday";
CREATE UNIQUE INDEX "Birthday_guildId_userId_key" ON "Birthday"("guildId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReactionRoles_guildId_messageId_emoji_key" ON "ReactionRoles"("guildId", "messageId", "emoji");
