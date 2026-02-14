-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "remindInterval" TEXT NOT NULL DEFAULT 'NONE'
);
INSERT INTO "new_Reminders" ("createdAt", "id", "message", "remindAt", "remindInterval", "userId") SELECT "createdAt", "id", "message", "remindAt", "remindInterval", "userId" FROM "Reminders";
DROP TABLE "Reminders";
ALTER TABLE "new_Reminders" RENAME TO "Reminders";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
