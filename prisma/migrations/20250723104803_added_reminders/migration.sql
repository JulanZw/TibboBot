-- CreateTable
CREATE TABLE "Reminders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "remindAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL
);
