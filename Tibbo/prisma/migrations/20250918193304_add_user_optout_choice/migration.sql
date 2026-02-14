-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "discordId" TEXT NOT NULL PRIMARY KEY,
    "points" BIGINT NOT NULL,
    "char_count" BIGINT NOT NULL,
    "msg_count" INTEGER NOT NULL,
    "optedout" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_User" ("char_count", "discordId", "msg_count", "points") SELECT "char_count", "discordId", "msg_count", "points" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
