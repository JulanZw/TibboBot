/*
  Warnings:

  - The primary key for the `Guild` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Guild` table. All the data in the column will be lost.
  - You are about to drop the column `pointGiver` on the `Guild` table. All the data in the column will be lost.
  - Added the required column `pointGiverId` to the `Guild` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "guildId" TEXT NOT NULL,
    "countChannelId" TEXT,
    "countNumber" INTEGER NOT NULL DEFAULT 0,
    "todayIsChannelId" TEXT,
    "birthdayChannelId" TEXT,
    "pointGiverId" TEXT NOT NULL,
    CONSTRAINT "Guild_pointGiverId_fkey" FOREIGN KEY ("pointGiverId") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Guild" ("birthdayChannelId", "countChannelId", "countNumber", "guildId", "todayIsChannelId") SELECT "birthdayChannelId", "countChannelId", "countNumber", "guildId", "todayIsChannelId" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");
CREATE UNIQUE INDEX "Guild_countChannelId_key" ON "Guild"("countChannelId");
CREATE UNIQUE INDEX "Guild_todayIsChannelId_key" ON "Guild"("todayIsChannelId");
CREATE UNIQUE INDEX "Guild_birthdayChannelId_key" ON "Guild"("birthdayChannelId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
