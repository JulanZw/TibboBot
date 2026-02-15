import {
  PermissionLevel,
  safeReply,
  stringOption,
} from '@julanzw/ttoolbox-discord-framework';
import { $Enums } from '@prisma/client';
import {
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder,
} from 'discord.js';

import {
  getUserReminders,
  createReminder,
} from '../../../database/reminders.ts';
import { incrementStatistic } from '../../../database/stats.ts';
import { BotCommand } from '../../../impl/BotCommand.class.ts';
import { hasOptedOut } from '../../../utils/managers/optInOutManager.ts';
import { scheduleReminder } from '../../../utils/managers/reminderManager.ts';
import { parseDurationOrDateString } from '../../../utils/parsers.ts';
import { logger } from '../../../index.ts';

const scope = 'reminder_add';

export class AddReminderCommand extends BotCommand {
  name = 'add';
  description = 'Set a new reminder';
  guildOnly = false;
  permissionLevel: PermissionLevel = 'user';

  protected async run(interaction: ChatInputCommandInteraction): Promise<void> {
    if (hasOptedOut(interaction.user.id)) {
      await safeReply(
        interaction,
        'You have opted out of data collection, so you cannot create a reminder.',
      );
      return;
    }

    const when = interaction.options.getString('when', true);
    const message = interaction.options.getString('message', true);
    const repeat = interaction.options.getString('repeat', false);

    const targetTime = parseDurationOrDateString(when);
    if (!targetTime) {
      await safeReply(interaction, 'Invalid date/time format.', true);
      return;
    }

    const maxTime = Date.now() + 1000 * 60 * 60 * 24 * 365;
    if (targetTime.getTime() > maxTime) {
      await safeReply(
        interaction,
        'Reminders can only be up to 1 year in the future.',
        true,
      );
      return;
    } else if (targetTime.getTime() < Date.now()) {
      await safeReply(
        interaction,
        'You cannot set a reminder in the past.',
        true,
      );
      return;
    }

    const userReminders = await getUserReminders(interaction.user.id);
    if (userReminders.length > 10) {
      await safeReply(
        interaction,
        'You cannot have more than 10 reminders!',
        true,
      );
      return;
    }

    const reminder = await createReminder(
      interaction.user.id,
      message,
      targetTime,
      repeat && repeat in $Enums.Intervals
        ? $Enums.Intervals[repeat as keyof typeof $Enums.Intervals]
        : $Enums.Intervals.NONE,
    );

    const maxScheduleDate = new Date();
    maxScheduleDate.setDate(maxScheduleDate.getDate() + 1);
    if (targetTime < maxScheduleDate) {
      scheduleReminder(interaction.user, reminder);
    }

    await safeReply(
      interaction,
      `Reminder set for <t:${Math.floor(targetTime.getTime() / 1000)}:F>, make sure you have direct messages turned on for this server!`,
    );
    logger.info(
      `Created reminder for ${interaction.user.id} on ${targetTime.toISOString()}`,
      scope,
    );
    await incrementStatistic('remindersSet', interaction.user.id, 1);
  }

  customize(
    builder: SlashCommandSubcommandBuilder,
  ): SlashCommandSubcommandBuilder {
    return builder
      .addStringOption(
        stringOption('when', 'When you need to be reminded', true),
      )
      .addStringOption(
        stringOption('message', 'What you need to be reminded of', true),
      )
      .addStringOption((option) =>
        option
          .setName('repeat')
          .setDescription('How often to repeat this reminder')
          .addChoices(
            { name: 'Daily', value: $Enums.Intervals.DAILY },
            { name: 'Weekly', value: $Enums.Intervals.WEEKLY },
          )
          .setRequired(false),
      );
  }
}
