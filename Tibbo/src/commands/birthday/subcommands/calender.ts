import { ChatInputCommandInteraction } from 'discord.js';
import {
  safeReply,
  formatDateToString,
  PaginatedEmbed,
  embedBuilder,
} from '@julanzw/ttoolbox-discord-framework';

import { getAllBirthdaysInGuild } from '../../../database/birthday.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';

export class CalendarBirthdayCommand extends BotCommand {
  name = 'calender';
  description = 'Get all the birthdays in this server';
  guildOnly = true;
  permissionLevel = 'user' as const;

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await safeReply(
        interaction,
        `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
      );
      return;
    }

    const birthdays = await getAllBirthdaysInGuild(interaction.guildId);

    if (birthdays.length === 0) {
      await safeReply(
        interaction,
        'No birthdays have been set in this server yet.',
      );
      return;
    }

    const birthdayPages = new Map<string, { name: string; value: string }[]>();

    for (const birthday of birthdays) {
      const birthdayMonth = birthday.birthday.toLocaleString('en-US', {
        month: 'long',
      });
      if (birthdayPages.has(birthdayMonth)) {
        birthdayPages.get(birthdayMonth)?.push({
          name: formatDateToString(birthday.birthday),
          value: `<@${birthday.userId}>`,
        });
      } else {
        birthdayPages.set(birthdayMonth, [
          {
            name: formatDateToString(birthday.birthday),
            value: `<@${birthday.userId}>`,
          },
        ]);
      }
    }

    const monthOrder = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const months = Array.from(birthdayPages.keys()).sort(
      (a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b),
    );

    // Assuming PaginatedEmbed is a class that handles pagination
    const paginator = new PaginatedEmbed(
      interaction,
      months,
      (month, index, total) => [
        embedBuilder({
          title: 'Calendar',
          fields: birthdayPages.get(month) ?? [],
          footer: `Page ${index + 1} of ${total}`,
        }),
      ],
    );

    await paginator.start();
  }
}
