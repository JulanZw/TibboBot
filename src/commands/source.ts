import path from 'path';
import fs from 'fs';

import archiver from 'archiver';
import { MessageFlags } from 'discord.js';

import { commandBuilder, safeReply } from '../utils/general';
import { sourceRequestTracker } from '../utils/constants';
import { logWithTime } from '../utils/logging';

export const sourceCommand = commandBuilder(
  'source',
  'Get a zipped archive of the source code',
  async (interaction, client) => {
    if (process.env.ENV === 'dev') {
      return await safeReply(
        interaction,
        'You cannot request the source code right now. Please try again later (watch the bot status).',
        true,
      );
    }
    const userId = interaction.user.id;

    if (sourceRequestTracker.has(userId)) {
      return await safeReply(
        interaction,
        "You've already requested the source code today. Please try again tomorrow.",
        true,
      );
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

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    output.on('close', async () => {
      try {
        const user = await client.users.fetch(userId);
        await user.send({
          content: 'Here is the zipped source code!',
          files: [zipPath],
        });

        await interaction.editReply({
          content: 'Source code sent to your DMs!',
        });
      } catch (err: any) {
        logWithTime('Failed to send source ZIP:' + err, 'error', true);
        await interaction.editReply({
          content:
            'Failed to send the source code via DM. Please check your privacy settings.',
        });
      } finally {
        fs.unlink(zipPath, (err: any) => {
          if (err)
            logWithTime('Failed to delete temp zip: ' + err, 'error', true);
        });
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    archive.on('error', async (err: any) => {
      logWithTime('Archive error:' + err, 'error', true);
      await interaction.editReply('An error occurred while creating the ZIP.');
    });

    archive.pipe(output);

    archive.directory(srcFolderPath, 'src');
    archive.directory(prismaPath, 'prisma');

    [
      'README.md',
      'LICENSE',
      'package.json',
      'tsconfig.json',
      '.example.env',
    ].forEach((file) =>
      archive.file(path.join(rootPath, file), { name: file }),
    );

    await archive.finalize();
  },
  false,
  'user',
);
