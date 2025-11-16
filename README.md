# Tibbo Discord Bot

Tibbo the toolbox is a multipurpose Discord bot built with TypeScript using `discord.js` and Prisma.  
Includes features like mini games, reminders, backups and more.

---

## Setup

*Note:* \
*Node version 22 or above required*

1. **Clone the repository**

   ```bash
   git clone https://github.com/JulanZw/TibboBot.git
   cd TibboBot
   ```

2. **install dependencies**

   ```bash
   npm install
   ```

3. **Create a .env file (see .example.env)**

4. **Generate the Prisma client**

   ```bash
   npx prisma generate
   ```

5. **Run the bot**

   ```bash
   npm run prod
   ```

## Project Structure

```markdown
TibboBot
├── logs
│   └── latest.log
├── package-lock.json
├── package.json
├── prisma
│   ├── migrations/
│   └── schema.prisma
├── src
│   ├── commands
│   │   └── All commands...
│   ├── database
│   │   └── All db functions...
│   ├── handlers
│   │   └── All handlers...
│   ├── utils
│   │   └── All util functions...
│   ├── commands.ts
│   ├── cronJobs.ts
│   └── index.ts
├── README.md
├── .env
├── .example.env
├── .gitignore
├── .prettierrc
├── eslint.config.mts
├── LICENSE
└── tsconfig.json
```

## Slash Commands

(This might not be fully up to date)

─── BACKUP ───\
All commands related to backups.\
› create - Makes a backup of a channel.

─── OPT ───\
The commands for opting in and out of data collection\
› out - Stops collection of message counts and similar stats for your account.\
› in - Allows collection of message counts and similar stats for your account.

─── MANAGE ───\
All commands related to managing things for the bot inside the guild\
› channels - A command to manage the game channels\
› backups - Change if backups are allowed or not\
› data - Removes all the data of the guild.

─── BIRTHDAY ───\
All commands related to birthdays\
› set - Set your birthday for this server\
› calender - Get all the birthdays in this server

─── MESSAGES ───\
All commands related to messages\
› leaderboard - Show the leaderboard for all characters and messages sent\
› user - Show the amount of messages and characters someone sent

─── REMINDER ───\
All commands related to your reminders\
› add - Set a new reminder\
› list - List and manage your reminders

─── REACTION ───\
All commands for creating and updating a reaction message\
› add - Adds a reaction role to a message after creating a reaction role message.\
› create - Create a reaction role message

─── TODAY-IS ───\
All commands for today-is\
› leaderboard - Show the leaderboard for the today-is points\
› add - Give today-is points to someone\
› deduct - Deduct today-is points from someone\
› pointgiver - Set the servers pointgiver (admin only)

─── ENCODE ───\
Encode or decode text using Base64 or Morse code\
› base64 - Encode or decode Base64\
› morse - Encode or decode Morse code\
› caesar - Encode or decode using Caesar cipher

─── HOWTO ───\
All howto commands\
› breathe - How does one breathe\
› eat - How does one eat

─── OTHER ───\
Other commands\
› magic - does some magic (bot owner only)\
› help - Displays all commands.\
› ping - Responds with "pong" to check if the bot is online.\
› rng - Responds with a random number. If a range is provided, responds with a number within that range\
› cat - Sends a random cat picture.\
› source - Get a link to the source code\

Implementation can be found in [this file](./src/commands.ts)

## License

MIT License © 2025 JulanZw

See [LICENSE](./LICENSE.txt) for full text.
