import { getGuild } from '../database/guild';
import { getUser } from '../database/user';
import { showConfirmModal } from '../utils/confirmation';
import { commandBuilder, safeReply } from '../utils/general';
import { Subcommand } from '../utils/typesAndInterfaces';

export const purgeCommand = commandBuilder({
  name: 'purge',
  description: 'All commands related to data removal',
  subcommands: new Map<string, Subcommand>([
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

          await showConfirmModal(interaction, 'purge_user_confirm_modal');
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

          await showConfirmModal(interaction, 'purge_guild_confirm_modal');
        },
        customize: (builder) => builder,
        permissionLevel: 'admin',
        guildOnly: true,
      },
    ],
  ]),
});
