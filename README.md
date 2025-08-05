# JZZWutils Discord Bot

A custom multipurpose Discord bot built with TypeScript using `discord.js`.  
Includes features like counting channels, reminders and more.

---

## Setup

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

| Command              | Description                                                                 |
|----------------------|-----------------------------------------------------------------------------|
| /magic               | Does some magic (bot owner only)                                            |
| /add_points          | Adds points to the user (can only be used by the server's point giver)      |
| /leaderboard         | Shows the top users on the message count board.                             |
| /help                | Displays all commands.                                                      |
| /ping                | Responds with "pong" to check if the bot is online.                         |
| /messages            | Displays the message count for a specified user.                            |
| /today_is_board      | Shows the top users on the today is leaderboard.                            |
| /cat                 | Sends a random cat picture.                                                 |
| /set_point_giver     | Sets the point giver for this server. (admin only)                          |
| /set_today_is_channel| Sets the channel the bot will send the "today is x" message to. (admin only)|
| /set_birthday_channel| Sets the birthday channel of the guild. (admin only)                        |
| /set_birthday        | Set your birthday for this server                                           |
| /set_count_channel   | Sets the count channel of the guild. (admin only)                           |
| /set_reminder        | Sets a reminder                                                             |
| /my_reminders        | Shows all your reminders and allows you to edit them                        |
| /source              | Get a zipped archive of the source code                                     |

Implementation can be found in [this file](./src/commands.ts)

## License

MIT License © 2025 Julan Zwiggelaar

See [LICENSE](./LICENSE) for full text.
