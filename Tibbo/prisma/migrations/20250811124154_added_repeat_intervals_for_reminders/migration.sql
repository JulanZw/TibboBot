/*
  Warnings:

  - Added the required column `remindInterval` to the `Reminders` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "remindInterval" TEXT NOT NULL
);
INSERT INTO "new_Reminders" ("createdAt", "id", "message", "remindAt", "userId") SELECT "createdAt", "id", "message", "remindAt", "userId" FROM "Reminders";
DROP TABLE "Reminders";
ALTER TABLE "new_Reminders" RENAME TO "Reminders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
