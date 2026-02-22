import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import {
  PermissionLevel,
  safeReply,
  formatDateToString,
  stringOption,
} from '@julanzw/ttoolbox-discordjs-framework';

import { setBirthday } from '../../../database/birthday.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { hasOptedOut } from '../../../utils/managers/optInOutManager.ts';
import { parseBirthdayDate } from '../../../utils/parsers.ts';
import { logger } from '../../../index.ts';

const scope = 'birthday_set';

export class SetBirthdayCommand extends BotCommand {
  name = 'set';
  description = 'Set your birthday for this server';
  guildOnly = true;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (hasOptedOut(interaction.user.id)) {
      await safeReply(
        interaction,
        'You have opted out of data collection, so you cannot set your birthday.',
      );
      return;
    }
    if (!interaction.guildId) {
      await safeReply(
        interaction,
        `Uhhh... Well this is akward... You arent supposed to see this message... Please contact the bot owner`,
      );
      return;
    }

    const date = interaction.options.getString('date');
    if (!date) {
      await safeReply(interaction, 'No birthday was provided');
      return;
    }

    const birthday = parseBirthdayDate(date);
    if (!birthday) {
      await safeReply(
        interaction,
        'Invalid date format. Please use DD-MM-YYYY or YYYY-MM-DD.',
      );
      return;
    }

    const newBirthday = await setBirthday(
      interaction.guildId,
      interaction.user.id,
      birthday,
    );

    if (!newBirthday) {
      await safeReply(
        interaction,
        'Something went wrong while setting your birthday...',
      );
      return;
    }

    logger.info(
      `Set birthday for ${newBirthday.userId} on ${formatDateToString(newBirthday.birthday)}`,
      scope,
    );

    await safeReply(
      interaction,
      `Set birthday for <@${newBirthday.userId}> on ${formatDateToString(newBirthday.birthday)}`,
    );
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder.addStringOption(
      stringOption('date', 'Enter a date (DD-MM-YYYY or YYYY-MM-DD)', true),
    );
  }
}
