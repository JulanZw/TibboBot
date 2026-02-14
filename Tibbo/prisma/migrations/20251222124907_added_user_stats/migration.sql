-- CreateTable
CREATE TABLE "Stats" (
    "userid" TEXT NOT NULL,
    "messagesSentThisYear" INTEGER NOT NULL DEFAULT 0,
    "charsSentThisYear" INTEGER NOT NULL DEFAULT 0,
    "todayIsParticipationDays" INTEGER NOT NULL DEFAULT 0,
    "todayIsWins" INTEGER NOT NULL DEFAULT 0,
    "remindersSet" INTEGER NOT NULL DEFAULT 0,
    "catsRequested" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Stats_userid_fkey" FOREIGN KEY ("userid") REFERENCES "User" ("discordId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Stats_userid_key" ON "Stats"("userid");
