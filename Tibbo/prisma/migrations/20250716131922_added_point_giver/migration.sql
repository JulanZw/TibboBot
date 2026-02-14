-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "countChannelId" TEXT,
    "countNumber" INTEGER NOT NULL DEFAULT 0,
    "todayIsChannelId" TEXT,
    "birthdayChannelId" TEXT,
    "pointGiver" TEXT
);
INSERT INTO "new_Guild" ("birthdayChannelId", "countChannelId", "countNumber", "guildId", "id", "todayIsChannelId") SELECT "birthdayChannelId", "countChannelId", "countNumber", "guildId", "id", "todayIsChannelId" FROM "Guild";
DROP TABLE "Guild";
ALTER TABLE "new_Guild" RENAME TO "Guild";
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");
CREATE UNIQUE INDEX "Guild_countChannelId_key" ON "Guild"("countChannelId");
CREATE UNIQUE INDEX "Guild_todayIsChannelId_key" ON "Guild"("todayIsChannelId");
CREATE UNIQUE INDEX "Guild_birthdayChannelId_key" ON "Guild"("birthdayChannelId");
CREATE UNIQUE INDEX "Guild_pointGiver_key" ON "Guild"("pointGiver");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
