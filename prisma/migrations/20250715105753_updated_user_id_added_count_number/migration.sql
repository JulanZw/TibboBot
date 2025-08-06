/*
  Warnings:

  - You are about to drop the column `BirthdayChannelId` on the `Guild` table. All the data in the column will be lost.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `User` table. All the data in the column will be lost.
  - Added the required column `birthdayChannelId` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `char_count` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `discordId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `msg_count` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "countChannelId" TEXT NOT NULL,
    "countNumber" INTEGER NOT NULL DEFAULT 0,
    "todayIsChannelId" TEXT NOT NULL,
    "birthdayChannelId" TEXT NOT NULL
);
INSERT INTO "new_Guild" ("countChannelId", "guildId", "id", "todayIsChannelId") SELECT "countChannelId", "guildId", "id", "todayIsChannelId" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");
CREATE UNIQUE INDEX "Guild_countChannelId_key" ON "Guild"("countChannelId");
CREATE UNIQUE INDEX "Guild_todayIsChannelId_key" ON "Guild"("todayIsChannelId");
CREATE UNIQUE INDEX "Guild_birthdayChannelId_key" ON "Guild"("birthdayChannelId");
CREATE TABLE "new_User" (
    "discordId" TEXT NOT NULL PRIMARY KEY,
    "birthday" DATETIME,
    "points" INTEGER NOT NULL,
    "char_count" INTEGER NOT NULL,
    "msg_count" INTEGER NOT NULL
);
INSERT INTO "new_User" ("birthday", "points") SELECT "birthday", "points" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
