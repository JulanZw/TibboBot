/*
  Warnings:

  - You are about to alter the column `msg_count` on the `User` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Int`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "discordId" TEXT NOT NULL PRIMARY KEY,
    "points" BIGINT NOT NULL,
    "char_count" BIGINT NOT NULL,
    "msg_count" INTEGER NOT NULL
);
INSERT INTO "new_User" ("char_count", "discordId", "msg_count", "points") SELECT "char_count", "discordId", "msg_count", "points" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
