import { ActionRowBuilder, ComponentType, ModalBuilder, RESTPostAPIChatInputApplicationCommandsJSONBody, SlashCommandBuilder, TextInputBuilder, TextInputStyle, MessageFlags, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType } from 'discord.js';
import { commandBuilder,COMMANDS_PER_PAGE,createButtonsRow,embedBuilder,formatDate,formatDateToDDMMYYYY,getDateKey,logWithTime, parseBirthdayDate, parseDurationOrDateString, pendingReactionRoleSetups, PermissionLevel, reminderDaysCache, safeReply, sourceRequestTracker } from './utils';
import wol from 'wol';
import { addReactionRole, createReminder, deleteReminder, getAllUsersCharsAndMessages, getAllUsersDataTodayIs, getGuild, getPointGiverIdOfGuild, getReactionRolesByMessage, getUserCharsAndMessages, getUserPoints, getUserReminders, insertUserData, setBirthday, setPointGiverOfGuild, updateChannel, updateUserPoints } from './database';
import { channelOption, integerOption, roleOption, stringOption, userOption } from './options';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { botId } from './index';
import dotenv from 'dotenv';

dotenv.config();

//#region Utility

const wolCommand = commandBuilder(
  'magic',
  'does some magic (bot owner only)',
  async (interaction, client) => {
    if(!process.env.WOL_MAC || !process.env.WOL_IP){
      logWithTime('Cannot execute WOL because MAC or IP is not set','error',true)
      return await safeReply(interaction, 'IP or MAC has not been set');
    }

    const succes = await wol.wake(process.env.WOL_MAC, {
      address: process.env.WOL_IP,
      port: 9
    });
    return await safeReply(interaction, (succes ? 'magic...' : 'magic failed... :('));
  },
  false,
  'owner'
);

const helpCommand = commandBuilder(
  'help',
  'Displays all commands.',
  async (interaction) => {
    let index = 0;
    const totalPages = Math.ceil(commands.length / COMMANDS_PER_PAGE);

    let start = index * COMMANDS_PER_PAGE;
    let end = start + COMMANDS_PER_PAGE;
    let pageCommands = commands.slice(start, end);

    const embed = embedBuilder({
      title: 'List of Available Commands',
      description: 'Here are the commands you can use:',
      fields: pageCommands.map((cmd) => ({
        name: `/${cmd.name}`,
        value: cmd.description,
      })),
      footer: `Page ${index + 1} of ${totalPages}`,
    });

    const components = [createButtonsRow(index, totalPages,['prev', 'next'])];

    await safeReply(interaction, '', false, [embed], components);

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000, // 2 mins
    });

    collector.on('collect', async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        return await safeReply(buttonInteraction, 'You cannot use this button.', true);
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
          return await safeReply(buttonInteraction, 'Invalid action.', true);
      }

      start = index * COMMANDS_PER_PAGE;
      end = start + COMMANDS_PER_PAGE;
      pageCommands = commands.slice(start, end);

      const newEmbed = embedBuilder({
        title: 'List of Available Commands',
        description: 'Here are the commands you can use:',
        fields: pageCommands.map((cmd) => ({
          name: `/${cmd.name}`,
          value: cmd.description,
        })),
        footer: `Page ${index + 1} of ${totalPages}`,
      });

      const newComponents = [createButtonsRow(index, totalPages,['prev', 'next'])];

      await buttonInteraction.update({ embeds: [newEmbed], components: newComponents });
    });

    collector.on('end', () => {
      if (msg.editable) {
        msg.edit({ components: [] });
      }
    });
  },
  false,
  'user'
);

const pingCommand = commandBuilder(
  'ping',
  'Responds with "pong" to check if the bot is online.',
  async (interaction, client) => {
    await safeReply(interaction,'pong');
  },
  false,
  'user'
);

//#endregion

//#region Chars And Messages

const messagesCommand = commandBuilder(
  'messages',
  'Displays the message count for a specified user.',
  async (interaction, client) => {
    const targetUser = interaction.options.getUser('target');
    
    if(!targetUser){
      return await safeReply(interaction, 'No target user was provided.')
    }

    const user = await getUserCharsAndMessages(targetUser.id);
    if(user){
      await safeReply(interaction,`User ${targetUser.username} has sent ${user.char_count} charachter(s) in ${user.msg_count} message(s).`);
    }else{
      await safeReply(interaction, `User ${targetUser.username} has not sent any messages yet.`);
    }
  },
  false,
  'user',
  builder => {
    builder.addUserOption(userOption('target','The user to check'));
    return builder;
  }    
);

const leaderboardCommand = commandBuilder(
  'leaderboard',
  'Shows the top users on the message count board.',
  async (interaction, client) => {
    const users = await getAllUsersCharsAndMessages();

    if (!users || users.length === 0) {
      return await safeReply(interaction, 'No user data available for the leaderboard.');
    }

    const fields = await Promise.all(
      users.slice(0, 10).map(async (row, index) => {
        try {
          const user = await client.users.fetch(row.discordId);

          return {
            name: `#${index + 1} - ${user.displayName ?? user.username}`,
            value: `Messages: ${row.msg_count}, Characters: ${row.char_count}`,
            inline: false
          };
        } catch (error) {
          logWithTime('Error fetching user:' + error, 'error', true);
          return {
            name: `#${index + 1} - Unknown User`,
            value: `Messages: ${row.msg_count}, Characters: ${row.char_count}`,
            inline: false
          };
        }
      })
    );

    const leaderboardEmbed = embedBuilder({
      title: 'Leaderboard',
      fields
    });

    await safeReply(interaction, '', false, [leaderboardEmbed]);
  },
  false,
  'user'
);

//#endregion

//#region Cat

const catCommand = commandBuilder(
  'cat',
  'Sends a random cat picture.',
  async (interaction, client) =>
  {
    try{
      const response = await fetch('https://api.thecatapi.com/v1/images/search');
      const data = await response.json();
      const imageUrl = data[0].url;

      const catEmbed = embedBuilder({
        title: 'Here\'s a cat for you!',
        customize: (embed) => embed.setImage(imageUrl),
      });

      await safeReply(interaction,'',false, [catEmbed] );
    } catch (err) {
      logWithTime('Error fetching cat image:'+err,'warn',true);
      await safeReply(interaction,'Sorry, I couldn\'t fetch a cat image.');
    }
  },
  false,
  'user'
);

//#endregion

//#region Today Is

const setPointGiverCommand = commandBuilder(
  'set_point_giver',
  'Sets the point giver for this server. (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string);

    if(!guild){
      return await safeReply(interaction,`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetUser = interaction.options.getUser('target');

    if(!targetUser){
      return await safeReply(interaction,'No target user was provided.');
    }

    await setPointGiverOfGuild(interaction.guildId as string,targetUser.id);
    await safeReply(interaction,guild.todayIsChannelId ? `set <@${targetUser.id}> as the server's point giver` : `set <@${targetUser.id}> as the server's point giver. Dont forget to also set a todayIs channel!`);
    logWithTime(`Set ${targetUser.id} as pointgiver for ${guild.guildId}`,'info');
  },
  true,
  'admin',
  builder => {
    builder.addUserOption(userOption('target','The user put as point giver'));
    return builder;
  } 
);

const addPointsCommand = commandBuilder(
  'add_points',
  'adds points to the user (can only be used by the servers point giver)',
  async (interaction, client) => {
    const pointGiverId = await getPointGiverIdOfGuild(interaction.guildId as string);

    if(!pointGiverId){
      return await safeReply(interaction,'This server doesnt have a point giver')
    }

    if (interaction.user.id !== pointGiverId) {
      return await safeReply(interaction,`Only <@${pointGiverId}> can give points`);
    }

    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');

    if(!amount || !targetUser){
      return await safeReply(interaction,`You did not provide a target user or points!`);
    }

    if(amount<0){
      await safeReply(interaction,`Could not add ${amount} points for ${targetUser.username} as negative values are not accepted.`);
      logWithTime(`Error: Could not add \'${amount}\' points for \'${targetUser.username}\' as negative values are not accepted.`,'error',true);
    }

    const row = await getUserPoints(targetUser.id);
    if(!row){
      await insertUserData(targetUser.id,BigInt(0),0,BigInt(amount));
    }else{
      await updateUserPoints(targetUser.id,BigInt(amount)+row.points,interaction);
    }
    if(targetUser.id === botId){
      await safeReply(interaction,`Thank you <@${interaction.user.id}> for the ${amount} points`);
      logWithTime(`${amount} points were given to the bot`,'info');
    }else{
      await safeReply(interaction,`Added ${amount} points for ${targetUser.username}.`);
      logWithTime(`${amount} points were given to \'${targetUser.username}\'`,'info');
    }
  },
  false,
  'user',
  builder => {
    builder.addUserOption(userOption('target','The user to give points to'));
    builder.addIntegerOption(integerOption('amount','The amount of points to give'));
    return builder;
  },
);

const todayIsBoardCommand = commandBuilder(
  'today_is_board',
  'Shows the top users on the today is leaderboard.',
  async (interaction, client) => {
    const users = await getAllUsersDataTodayIs();

    if (!users || users.length === 0) {
      return await safeReply(interaction, 'No user data available for the leaderboard.');
    }

    const fields = await Promise.all(
      users.slice(0, 10).map(async (row, index) => {
        try {
          const user = await client.users.fetch(row.discordId);

          return {
            name: `#${index + 1}: ${user.displayName ?? user.username}`,
            value: `${row.points} points`,
            inline: false,
          };
        } catch (error) {
          console.error('Error fetching user:', error);
          return {
            name: `#${index + 1}: Unknown User`,
            value: `${row.points} points`,
            inline: false,
          };
        }
      }
    ));

    const pointboardEmbed = embedBuilder({
      title: 'Today Is Leaderboard',
      fields,
    });

    await safeReply(interaction, '', false, [pointboardEmbed]);
  },
  false,
  'user'
);

//#endregion

//#region Birthday

const setBirthdayCommand = commandBuilder(
  'set_birthday',
  'Set your birthday for this server',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string); // ? this gets checked in the main loop before it reaches this

    if(!guild){
      return await safeReply(interaction,`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const date = interaction.options.getString('date');

    if(!date){
      return await safeReply(interaction,'No birthday was provided');
    }

    const birthday = parseBirthdayDate(date);

    if(!birthday){
      return await safeReply(interaction,'Invalid date format. Please use DD-MM-YYYY or YYYY-MM-DD.');
    }

    const newBirthday = await setBirthday(guild.guildId,interaction.user.id,birthday);
    
    if(!newBirthday){
      return await safeReply(interaction,'Something went wrong while setting your birthday...');
    } else {
      logWithTime(`Set birthday for ${newBirthday.userId} on ${formatDate(newBirthday.birthday)}`,'info');
      return await safeReply(interaction,`Set birthday for <@${newBirthday.userId}> on ${formatDate(newBirthday.birthday)}`);
    }
  },
  false,
  'user',
  builder => {
    builder.addStringOption(stringOption('date','Enter a date (DD-MM-YYYY or YYYY-MM-DD)'));
    return builder;
  },
);

//#endregion

//#region Reaction Roles

const reactionRolesCommand = commandBuilder(
  'reaction_roles',
  'Set up a reaction role message. (admin only)',
  async (interaction, client) => {
    const userId = interaction.user.id;

    const targetChannel = interaction.options.getChannel('target');
    const title = interaction.options.getString('title');

    if(!targetChannel){
      return await safeReply(interaction,'No target channel was provided.');
    }

    pendingReactionRoleSetups.set(userId, {
      interaction,
      emojiRoleMap: {},
      channelId: interaction.channelId,
      targetChannelId: targetChannel.id,
      title: title || 'Choose your role',
      messageIds: [],
    });

    await safeReply(
      interaction,
      'Please send the emoji + role pairs in this format: `🟥 @RedTeam`\nSend `done` when finished.',
      true
    );
    logWithTime('Reaction message proces started','info');
  },
  true,
  'admin',
  builder => {
    builder.addChannelOption(channelOption('target','The channel where reaction message will be in.',true));
    builder.addStringOption(stringOption('title','The title of the reaction role message (defaults to "Choose your role")',false));
    return builder;
  }
);

const addReactionRoleToMessageCommand = commandBuilder(
  'add_reaction_role',
  'Adds a reaction role to a message after creating a reaction role message.',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string);

    if(!guild){
      return await safeReply(interaction,`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const targetMessageId = interaction.options.getString('message_id');
    const emoji = interaction.options.getString('emoji');
    const role = interaction.options.getRole('role');

    if(!targetMessageId){
      return await safeReply(interaction,'No target message ID was provided.');
    } else if(!emoji){
      return await safeReply(interaction,'No emoji was provided.');
    } else if(!role){
      return await safeReply(interaction,'No role was provided.');
    }

    const reactionRoles = await getReactionRolesByMessage(targetMessageId);

    if(!reactionRoles || reactionRoles.length < 1){
      return await safeReply(interaction,'Message does not have any reaction roles.');
    }

    const channel = await client.channels.fetch(reactionRoles[0].channelId);

    if (!channel || !channel.isTextBased()) return await safeReply(interaction,'Invalid channel.');
    
    const message = await channel.messages.fetch(targetMessageId);

    if (message && message.editable) {
      if(reactionRoles.some(rr => rr.emoji === emoji)){
        return await safeReply(interaction,'This emoji is already used for a reaction role on this message.');
      }

      const newReactionRole = await addReactionRole(guild.guildId, targetMessageId, reactionRoles[0].channelId, emoji, role.id);

      if(!newReactionRole){
        logWithTime('Something went wrong while creating a reaction role','error',true);
        return await safeReply(interaction,'Something went wrong while creating the reaction role.');
      }

      const description = Object.entries([newReactionRole, ...reactionRoles])
        .map(([, reactionRole]) => `${reactionRole.emoji} = <@&${reactionRole.role}>`)
        .join('\n');

      const oldEmbed = message.embeds[0];

      const embed = embedBuilder(
        {
          title: oldEmbed.title ?? '',
          description,
          footer: oldEmbed.footer?.text ?? `Click the emojis to get the roles!`,
        }
      )

      await message.edit({ embeds: [embed] });
      await message.react(newReactionRole.emoji);

      return await safeReply(interaction,`Added reaction role ${emoji} for <@&${role.id}> to the message.`,true);
    } else {
      return await safeReply(interaction,'Message not found or not editable.');
    }
  },
  true,
  'admin',
  builder => {
    builder.addStringOption(stringOption('message_id','The ID of the message to add the reaction role to',true));
    builder.addStringOption(stringOption('emoji','The emoji to use for the reaction role',true));
    builder.addRoleOption(roleOption('role','The role to assign when the emoji is reacted to',true));
    return builder;
  }
);

//#endregion

//#region Reminders

const setReminderCommand = commandBuilder(
  'set_reminder',
  'Sets a reminder',
  async interaction => {
    const when = interaction.options.getString('when', true);
    const message = interaction.options.getString('message', true);

    const targetTime = parseDurationOrDateString(when);
    if (!targetTime) {
      return await safeReply(interaction, 'Invalid date/time format.', true );
    }

    const maxTime = Date.now() + 1000 * 60 * 60 * 24 * 365;
    if (targetTime.getTime() > maxTime) {
      return await safeReply(interaction, 'Reminders can only be up to 1 year in the future.', true );
    }

    const userReminders = await getUserReminders(interaction.user.id);
    if(userReminders.length > 10){
      return await safeReply(interaction, 'You cannot have more than 10 reminders!', true );
    }

    const reminder = await createReminder(interaction.user.id,message,targetTime);

    const maxCacheDate = new Date();
    maxCacheDate.setDate(maxCacheDate.getDate() + 1);
    if(targetTime < maxCacheDate){
      const dateKey = getDateKey(reminder.remindAt);
      if (!reminderDaysCache.has(dateKey)) {
        reminderDaysCache.set(dateKey, []);
      }
      reminderDaysCache.get(dateKey)!.push(reminder);
    }

    await safeReply(
      interaction,
      `Reminder set for <t:${Math.floor(targetTime.getTime() / 1000)}:F>, make sure you have direct messages turned on for this server!`,
      true,
    );
    logWithTime(`Created reminder for ${interaction.user.id} on ${targetTime}`,'info');
  },
  false,
  'user',
  builder => {
    builder.addStringOption(stringOption('when','When you need to be reminded',true));
    builder.addStringOption(stringOption('message','What you needed to be reminded of',true));
    return builder;
  }
);

const remindersCommand = commandBuilder(
  'my_reminders',
  'Shows all your reminders and allows you to edit them',
  async interaction => {
    const reminders = await getUserReminders(interaction.user.id);
    if (!reminders.length) {
      return await safeReply(interaction, 'You have no reminders.', true);
    }

    let index = 0;
    const userId = interaction.user.id;

    const buildEmbed = (
      reminder: {
        createdAt: Date;
        id: string;
        message: string;
        userId: string;
        remindAt: Date;
      }, 
      index: number
    ) => embedBuilder({
      title: `Reminder ${index + 1} of ${reminders.length}`,
      fields: [
        { name: 'Message', value: reminder.message },
        { name: 'Remind At', value: `<t:${Math.floor(reminder.remindAt.getTime() / 1000)}:F>` },
      ],
      footer: `Created: ${formatDateToDDMMYYYY(reminder.createdAt)}`
    });

    const buildComponents = () => [createButtonsRow(index, reminders.length)];

    await safeReply(interaction, '', true, [buildEmbed(reminders[index], index)], buildComponents());

    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on('collect', async (btnInteraction) => {
      if (btnInteraction.user.id !== userId) {
        return await safeReply(btnInteraction, 'You cannot use this button.', true);
      }

      const action = btnInteraction.customId;

      switch (action) {
        case 'prev':
          index = Math.max(0, index - 1);
          break;

        case 'next':
          index = Math.min(reminders.length - 1, index + 1);
          break;

        case 'delete': {
          await deleteReminder(reminders[index].id);
          reminders.splice(index, 1);

          if (!reminders.length) {
            collector.stop();
            return await btnInteraction.update({
              content: 'All reminders deleted.',
              embeds: [],
              components: []
            });
          }

          index = Math.min(index, reminders.length - 1);
          break;
        }

        case 'edit': {
          const reminder = reminders[index];
          const modal = new ModalBuilder()
            .setCustomId(`editReminderModal:${reminder.id}`)
            .setTitle('Edit Reminder')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('editMessage')
                  .setLabel('Reminder Message')
                  .setStyle(TextInputStyle.Paragraph)
                  .setRequired(true)
                  .setValue(reminder.message)
              ),
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('editTime')
                  .setLabel('Remind at (e.g. in 2 hours or in 3 days)')
                  .setStyle(TextInputStyle.Short)
                  .setRequired(true)
              )
            );

          return await btnInteraction.showModal(modal);
        }

        default:
          return await safeReply(btnInteraction, 'Invalid action.', true);
      }

      await btnInteraction.update({
        embeds: [buildEmbed(reminders[index], index)],
        components: buildComponents(),
      });
    });

    collector.on('end', async () => {
      if (msg.editable) {
        await msg.edit({ components: [] });
      }
    });
  },
  false,
  'user'
);

//#endregion

//#region Source

const sourceCommand = commandBuilder(
  'source',
  'Get a zipped archive of the source code',
  async (interaction, client) => {
    const userId = interaction.user.id;

    if (sourceRequestTracker.has(userId)) {
      await safeReply(
        interaction,
        "You've already requested the source code today. Please try again tomorrow.",
        true,
      );
      return;
    }

    sourceRequestTracker.add(userId);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const rootPath = path.resolve(__dirname, '../');
    const srcFolderPath = path.join(rootPath, 'src');
    const prismaPath = path.join(rootPath, 'prisma');
    const zipPath = path.join(rootPath, 'tmp/source.zip');

    fs.mkdirSync(path.dirname(zipPath), { recursive: true });

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      try {
        const user = await client.users.fetch(userId);
        await user.send({
          content: 'Here is the zipped source code!',
          files: [zipPath],
        });

        await interaction.editReply({ content: 'Source code sent to your DMs!' });
      } catch (error) {
        logWithTime('Failed to send source ZIP:' + error, 'error',true);
        await interaction.editReply({
          content: 'Failed to send the source code via DM. Please check your privacy settings.',
        });
      } finally {
        fs.unlink(zipPath, err => {
          if (err) console.error('Failed to delete temp zip:', err);
        });
      }
    });

    archive.on('error', err => {
      logWithTime('Archive error:' + err, 'error',true);
      interaction.editReply('An error occurred while creating the ZIP.');
    });

    archive.pipe(output);

    archive.directory(srcFolderPath, 'src');
    archive.directory(prismaPath, 'prisma');

    ['README.md', 'LICENSE', 'package.json', 'tsconfig.json', '.example.env'].forEach(file =>
      archive.file(path.join(rootPath, file), { name: file })
    );

    await archive.finalize();
  },
  false,
  'user'
);

//#endregion

//#region Manage Channels

const manageChannelsCommand = commandBuilder(
  'manage_channels',
  'Manage channels for the guild (admin only)',
  async (interaction, client) => {
    const guild = await getGuild(interaction.guildId as string);

    if(!guild){
      return await safeReply(interaction,`Guild is not in the database. You should never see this message, contact the bot owner please.`);
    }

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('channel_config_menu')
        .setPlaceholder('Select a channel setting to manage')
        .addOptions([
          { label: 'Birthday Channel', value: 'birthday' },
          { label: 'Counting Channel', value: 'count' },
          { label: 'Today-is Channel', value: 'today-is' },
        ])
    );

    await safeReply(
      interaction,
      'Which channel setting would you like to manage?',
      true,
      undefined,
      [selectRow],
    );

    const msg = await interaction.fetchReply();

    const menuCollector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id && i.customId === 'channel_config_menu',
      componentType: ComponentType.StringSelect,
      time: 60000,
    });

    menuCollector.on('collect', async (menuInteraction) => {
      const selected = menuInteraction.values[0];

      const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`set_${selected}`)
          .setLabel('Set New Channel')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`reset_${selected}`)
          .setLabel('Reset')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`cancel`)
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      await menuInteraction.update({
        content: `You selected: **${selected}**. Choose an action:`,
        components: [buttonRow],
      });

      menuCollector.stop();

      const buttonCollector = msg.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id && (i.customId.startsWith('set_') || i.customId.startsWith('reset_') || i.customId === 'cancel'),
        componentType: ComponentType.Button,
        time: 60000,
      });

      buttonCollector.on('collect', async (buttonInteraction) => {
        const [action, selected] = buttonInteraction.customId.split('_');

        if (action === 'cancel') {
          await buttonInteraction.update({
            content: 'Action cancelled.', components: []
          });
          return buttonCollector.stop();
        } else if (action === 'reset') {
          await updateChannel(guild.guildId, selected as 'count' | 'today-is' | 'birthday',null);
          logWithTime(`Reset ${selected} channel for ${guild.guildId}`,'info');
          await buttonInteraction.update({
            content: `${selected} channel reset.`, components: []
          });
          return buttonCollector.stop();
        } else {
          const channelSelect = new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
            new ChannelSelectMenuBuilder()
              .setCustomId(`choose_${selected}`)
              .setPlaceholder('Select a channel')
              .addChannelTypes(ChannelType.GuildText)
          );

          const channelMsg = await buttonInteraction.update({
            content: 'Pick a new channel below:',
            components: [channelSelect],
          });

          const channelCollector = channelMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id && i.customId === `choose_${selected}`,
            componentType: ComponentType.ChannelSelect,
            time: 60000,
          });

          channelCollector.on('collect', async (channelInteraction) => {
            const newChannel = channelInteraction.channels.first();
            if (!newChannel) return safeReply(channelInteraction, 'Invalid channel selected.', true );

            await updateChannel(guild.guildId, selected as 'count' | 'today-is' | 'birthday', newChannel.id);

            logWithTime(`Set ${selected} channel to ${newChannel.id} for ${guild.guildId}`,'info');

            await channelInteraction.update({
              content: `The ${selected} channel has been set to <#${newChannel.id}>.`,
              components: [],
            });

            channelCollector.stop();
          });

          channelCollector.on('end', (collected) => {
            if (collected.size === 0) {
              interaction.followUp({ content: 'Channel selection timed out.', flags: MessageFlags.Ephemeral });
            }
          });

          buttonCollector.stop();
        }
      });

      buttonCollector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.followUp({ content: 'No action selected in time.', flags: MessageFlags.Ephemeral });
        }
      });

      menuCollector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.editReply({ content: 'Menu timed out.', components: [] });
        }
      });
    });
  },
  true,
  'admin'
);

//#endregion

//#region Exports

/**
 * Represents a Discord slash command definition.
 *
 * Used internally to register and execute slash commands,
 * and to apply custom restrictions like admin or guild-only use.
 *
 * @property data - The actual slash command builder used for Discord.
 * @property name - The name of the command.
 * @property description - The description of the command.
 * @property adminOnly - Whether the command can only be executed by an admin (internal check).
 * @property guildOnly - Whether the command can only be executed in a guild (internal check).
 * @property execute - The function that runs when the command is used.
 */
export interface Command {
  data: SlashCommandBuilder;
  name: string;
  description: string;
  permissionLevel: PermissionLevel;
  guildOnly: boolean;
  execute: (...args: any[]) => Promise<any> | any;
}

export const commands: Command[] = [
  wolCommand,
  addPointsCommand,
  leaderboardCommand,
  helpCommand,
  pingCommand,
  messagesCommand,
  todayIsBoardCommand,
  catCommand,
  setPointGiverCommand,
  setBirthdayCommand,
  setReminderCommand,
  remindersCommand,
  sourceCommand,
  reactionRolesCommand,
  addReactionRoleToMessageCommand,
  manageChannelsCommand
]

export const commandsToRegister: RESTPostAPIChatInputApplicationCommandsJSONBody[] = commands.map(command => command.data.toJSON());

//#endregion