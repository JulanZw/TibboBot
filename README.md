# JZZWutils Discord Bot

A custom multipurpose Discord bot built with TypeScript using `discord.js`.  
Includes features like counting channels, reminders and more.

---

## Setup

*Note:* \
*Node version 22 or above required*

1. **Clone the repository** (soon?)

   ```bash
   git clone https://soon.git.repo/discord_bot.git
   cd discord_bot
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
   npm run dev
   ```

## Project Structure

```markdown
  discord_bot
  ├── .env
  ├── .gitignore
  ├── package-lock.json
  ├── package.json
  ├── prisma/
  ├── src/
  └── tsconfig.json
```

## Slash Commands

─── BIRTHDAY ───\
All commands related to birthdays\
› set – Set your birthday for this server

─── MESSAGES ───\
All commands related to messages\
› leaderboard   – Show the leaderboard for all characters and messages sent\
› user          – Show the amount of messages and characters someone sent

─── REMINDERS ───\
All commands related to your reminders\
› add           – Set a new reminder\
› list          – List and manage your reminders

─── REACTION ───\
All commands for creating and updating a reaction message\
› add           – Adds a reaction role to a message after creating a reaction role message.\
› create        – Create a reaction role message

─── TODAY-IS ───\
All commands related to today-is\
› leaderboard   – Show the leaderboard for the today-is points\
› add           – Give today-is points to someone\
› pointgiver    – Set the servers pointgiver (admin only)

─── OTHER ───\
Other commands\
› magic           – does some magic (bot owner only)\
› help            – Displays all commands.\
› ping            – Responds with "pong" to check if the bot is online.\
› cat             – Sends a random cat picture.\
› source          – Get a zipped archive of the source code\
› manage_channels – Manage channels for the guild (admin only)

Implementation can be found in [this file](./src/commands.ts)

## License

MIT License © 2025 Julan Zwiggelaar

See [LICENSE](./LICENSE) for full text.
