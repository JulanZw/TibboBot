import { ChatInputCommandInteraction } from 'discord.js';

import { stringOption } from '../../utils/discord/slashCommandOptions.ts';
import { safeReply } from '../../utils/discord/editAndReply.ts';
import { logWithTime } from '../../utils/logging.ts';
import { embedBuilder } from '../../utils/discord/embeds.ts';
import { formatDateToString } from '../../utils/formatting.ts';
import { parseBirthdayDate } from '../../utils/parsers.ts';
import {
  setBirthday,
  getAllBirthdaysInGuild,
} from '../../database/birthday.ts';
import { hasOptedOut } from '../../utils/managers/optInOutManager.ts';
import { Subcommand } from '../../types/commands.ts';
import { commandBuilder } from '../../utils/discord/commandBuilder.ts';
import { PaginatedEmbed } from '../../../core/utils/PaginatedEmbed.class.ts';

const scope = 'birthday';

const birthdayCommands = commandBuilder({
  name: 'birthday',
  description: 'All commands related to birthdays',
  subcommands: new Map<string, Subcommand>([
    [
      'set',
      {
        name: 'set',
        description: 'Set your birthday for this server',
        async execute(interaction) {
          if (hasOptedOut(interaction.user.id)) {
            return await safeReply(
              interaction,
              'You have opted out of data collection, so you cannot set your birthday.',
            );
          }
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const date = interaction.options.getString('date');
          if (!date) {
            return await safeReply(interaction, 'No birthday was provided');
          }

          const birthday = parseBirthdayDate(date);
          if (!birthday) {
            return await safeReply(
              interaction,
              'Invalid date format. Please use DD-MM-YYYY or YYYY-MM-DD.',
            );
          }

          const newBirthday = await setBirthday(
            interaction.guildId,
            interaction.user.id,
            birthday,
          );

          if (!newBirthday) {
            return await safeReply(
              interaction,
              'Something went wrong while setting your birthday...',
            );
          }

          logWithTime(
            `Set birthday for ${newBirthday.userId} on ${formatDateToString(newBirthday.birthday)}`,
            'info',
            scope,
          );

          return await safeReply(
            interaction,
            `Set birthday for <@${newBirthday.userId}> on ${formatDateToString(newBirthday.birthday)}`,
          );
        },
        customize: (builder) => {
          return builder.addStringOption(
            stringOption(
              'date',
              'Enter a date (DD-MM-YYYY or YYYY-MM-DD)',
              true,
            ),
          );
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
    [
      'calender',
      {
        name: 'calender',
        description: 'Get all the birthdays in this server',
        async execute(interaction: ChatInputCommandInteraction) {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const birthdays = await getAllBirthdaysInGuild(interaction.guildId);

          if (birthdays.length === 0) {
            return await safeReply(
              interaction,
              'No birthdays have been set in this server yet.',
            );
          }

          const birthdayPages = new Map<
            string,
            { name: string; value: string }[]
          >();

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
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
  ]),
});

export default birthdayCommands;
