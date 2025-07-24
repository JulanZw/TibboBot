# JZZWutils Discord Bot

A custom multipurpose Discord bot built with TypeScript using `discord.js`.  
Includes features like counting channels, reminders, point tracking, and more.

---

## Features

- Slash commands with ephemeral responses
- Daily counting game (auto-reset)
- Reminder system (supports natural time input)
- Reaction roles
- Leaderboard & statistics
- Source code command (zips & sends the `/src` directory)

---

## Setup

1. **Clone the repository**

   ```bash
   git clone https://your.git.repo/discord_bot.git
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

Can be found in [this file](./src/commands.ts) (Yes I am lazy)

## License

MIT License © 2025 Julan Zwiggelaar

See [LICENSE](./LICENSE) for full text.
