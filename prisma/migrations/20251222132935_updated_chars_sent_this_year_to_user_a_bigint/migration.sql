/*
  Warnings:

  - You are about to alter the column `charsSentThisYear` on the `Stats` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Stats" (
    "userId" TEXT NOT NULL,
    "messagesSentThisYear" INTEGER NOT NULL DEFAULT 0,
    "charsSentThisYear" BIGINT NOT NULL DEFAULT 0,
    "todayIsParticipationDays" INTEGER NOT NULL DEFAULT 0,
    "todayIsWins" INTEGER NOT NULL DEFAULT 0,
    "remindersSet" INTEGER NOT NULL DEFAULT 0,
    "catsRequested" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Stats" ("catsRequested", "charsSentThisYear", "messagesSentThisYear", "remindersSet", "todayIsParticipationDays", "todayIsWins", "userId") SELECT "catsRequested", "charsSentThisYear", "messagesSentThisYear", "remindersSet", "todayIsParticipationDays", "todayIsWins", "userId" FROM "Stats";
DROP TABLE "Stats";
ALTER TABLE "new_Stats" RENAME TO "Stats";
CREATE UNIQUE INDEX "Stats_userId_key" ON "Stats"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
