/*
  Warnings:

  - You are about to drop the column `userid` on the `Stats` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Stats` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stats" (
    "userId" TEXT NOT NULL,
    "messagesSentThisYear" INTEGER NOT NULL DEFAULT 0,
    "charsSentThisYear" INTEGER NOT NULL DEFAULT 0,
    "todayIsParticipationDays" INTEGER NOT NULL DEFAULT 0,
    "todayIsWins" INTEGER NOT NULL DEFAULT 0,
    "remindersSet" INTEGER NOT NULL DEFAULT 0,
    "catsRequested" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Stats" ("catsRequested", "charsSentThisYear", "messagesSentThisYear", "remindersSet", "todayIsParticipationDays", "todayIsWins") SELECT "catsRequested", "charsSentThisYear", "messagesSentThisYear", "remindersSet", "todayIsParticipationDays", "todayIsWins" FROM "Stats";
DROP TABLE "Stats";
ALTER TABLE "new_Stats" RENAME TO "Stats";
CREATE UNIQUE INDEX "Stats_userId_key" ON "Stats"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
