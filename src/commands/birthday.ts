import { ComponentType } from 'discord.js';

import { stringOption } from '../utils/slashCommandOptions';
import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { embedBuilder, createButtonsRow } from '../utils/embeds';
import { formatDate } from '../utils/formatting';
import { parseBirthdayDate } from '../utils/parsers';
import { setBirthday, getAllBirthdaysInGuild } from '../database/birthday';
import { Subcommand } from '../utils/typesAndInterfaces';

export const birthdayCommands = commandBuilder(
  'birthday',
  'All commands related to birthdays',
  async () => {},
  false,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'set',
      {
        name: 'set',
        description: 'Set your birthday for this server',
        async execute(interaction) {
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
            `Set birthday for ${newBirthday.userId} on ${formatDate(newBirthday.birthday)}`,
            'info',
          );

          return await safeReply(
            interaction,
            `Set birthday for <@${newBirthday.userId}> on ${formatDate(newBirthday.birthday)}`,
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
        async execute(interaction) {
          if (!interaction.guildId) {
            return await safeReply(
              interaction,
              `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
            );
          }

          const birthdays = await getAllBirthdaysInGuild(interaction.guildId);

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
                name: formatDate(birthday.birthday),
                value: `<@${birthday.userId}>`,
              });
            } else {
              birthdayPages.set(birthdayMonth, [
                {
                  name: formatDate(birthday.birthday),
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

          let index = 0;
          const totalPages = birthdayPages.size;

          const embed = embedBuilder({
            title: 'Calender',
            description: `The birthdays for: **${months[index]}**`,
            fields: birthdayPages.get(months[index]) ?? [],
            footer: `Page ${index + 1} of ${totalPages}`,
          });

          const components = [
            createButtonsRow(index, totalPages, ['prev', 'next']),
          ];

          await safeReply(interaction, '', false, [embed], components);

          const msg = await interaction.fetchReply();

          const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000, // 2 mins
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.user.id !== interaction.user.id) {
              return await safeReply(
                buttonInteraction,
                'You cannot use this button.',
                true,
              );
            }

            const action = buttonInteraction.customId;

            switch (action) {
              case 'prev':
                index = Math.max(0, index - 1);
                break;
              case 'next':
                index = Math.min(totalPages - 1, index + 1);
                break;
              default:
                return await safeReply(
                  buttonInteraction,
                  'Invalid action.',
                  true,
                );
            }

            const newEmbed = embedBuilder({
              title: 'Calender',
              description: `The birthdays for: **${months[index]}**`,
              fields: birthdayPages.get(months[index]),
              footer: `Page ${index + 1} of ${totalPages}`,
            });

            const newComponents = [
              createButtonsRow(index, totalPages, ['prev', 'next']),
            ];

            await buttonInteraction.update({
              embeds: [newEmbed],
              components: newComponents,
            });
          });

          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          collector.on('end', async () => {
            if (msg.editable) {
              await msg.edit({ components: [] });
            }
          });
        },
        permissionLevel: 'user',
        guildOnly: true,
      },
    ],
  ]),
);
