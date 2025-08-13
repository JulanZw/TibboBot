import { deleteAllBirthdaysForUser } from '../database/birthday';
import {
  deleteGuild,
  getGuild,
  removeAllPointgiverRolesForUser,
} from '../database/guild';
import { deleteAllRemindersForUser } from '../database/reminders';
import { deleteUser, getUser } from '../database/user';
import { commandBuilder, safeReply } from '../utils/general';
import { logWithTime } from '../utils/logging';
import { Subcommand } from '../utils/typesAndInterfaces';

const scope = 'purge';

export const purgeCommand = commandBuilder(
  'purge',
  'All commands related to data removal',
  async () => {},
  false,
  'user',
  (builder) => builder,
  new Map<string, Subcommand>([
    [
      'user',
      {
        name: 'user',
        description:
          'Removes all your data saved in this bot (birthdays, reminders, etc.).',
        async execute(interaction) {
          const user = await getUser(interaction.user.id);

          if (!user) {
            return await safeReply(
              interaction,
              'You are not in the database.',
              true,
            );
          }

          const userId = interaction.user.id;

          const deletedBirthdays = await deleteAllBirthdaysForUser(userId);
          logWithTime(
            `Removed all birthdays for user: ${userId}`,
            'info',
            scope,
          );
          const deletedReminders = await deleteAllRemindersForUser(userId);
          logWithTime(
            `Removed all reminders for user: ${userId}`,
            'info',
            scope,
          );
          const deletedPointGiverRoles =
            await removeAllPointgiverRolesForUser(userId);
          logWithTime(
            `Removed all pointgiver roles for user: ${userId}`,
            'info',
            scope,
          );
          await deleteUser(userId);
          logWithTime(`Deleted user: ${userId}`, 'info', scope);

          await safeReply(
            interaction,
            `**Deleted:**\nBirthdays: ${deletedBirthdays.count}\nReminders: ${deletedReminders.count}${deletedPointGiverRoles.count > 0 ? `\nPointgiver roles: ${deletedPointGiverRoles.count}` : ''}`,
          );
        },
        customize: (builder) => builder,
        permissionLevel: 'user',
        guildOnly: false,
      },
    ],
    [
      'guild',
      {
        name: 'guild',
        description: 'Removes all the data of the guild.',
        async execute(interaction) {
          const guild = await getGuild(interaction.guild!.id);

          if (!guild) {
            return await safeReply(
              interaction,
              'Guild is not in the database.',
              true,
            );
          }

          await deleteGuild(guild.guildId);
          logWithTime(`Deleted user: ${guild.guildId}`, 'info', scope);

          await safeReply(interaction, `**Deleted:**\nGuild: ${guild.guildId}`);
        },
        customize: (builder) => builder,
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
);
