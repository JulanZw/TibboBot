# TToolbox

A Discord.js bot framework with built-in handlers and utilities.

## Installation

```bash
npm install @julanzw/ttoolbox
```

## Quick Start

```typescript
import { Command, CommandManager } from '@julanzw/ttoolbox';

class PingCommand extends Command {
  name = 'ping';
  description = 'Pong!';
  guildOnly = false;
  permissionLevel = 'user';

  protected async run(interaction) {
    await interaction.reply('Pong!');
  }
}

const commandManager = new CommandManager();
commandManager.register(new PingCommand());
```

## Features

- Class-based command structure
- Built-in permission handling
- Cooldown management
- Pagination utilities
- Modal helpers
- Error handling
