-- CreateTable
CREATE TABLE "Guild" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "countChannelId" TEXT NOT NULL,
    "todayIsChannelId" TEXT NOT NULL,
    "BirthdayChannelId" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "birthday" DATETIME NOT NULL,
    "points" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Guild_guildId_key" ON "Guild"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_countChannelId_key" ON "Guild"("countChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_todayIsChannelId_key" ON "Guild"("todayIsChannelId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_BirthdayChannelId_key" ON "Guild"("BirthdayChannelId");
