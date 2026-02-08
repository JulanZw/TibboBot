import fsAsync from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import crypto from 'crypto';
import { createRequire } from 'module';

import archiver, { ArchiverOptions } from 'archiver';
import fetch from 'node-fetch';
import { TextChannel, ChatInputCommandInteraction } from 'discord.js';

import { logWithTime } from '../logging.ts';
import { safeEdit, safeReply } from '../discord/editAndReply.ts';

// have to do this because 'archiver-zip-encrypted' is not an ES module
const require = createRequire(import.meta.url);

// using a workaround I found here: https://github.com/artem-karpenko/archiver-zip-encrypted/issues/31#issuecomment-2404607515 since it doesnt have a type package

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

const backupQueue: ChatInputCommandInteraction[] = [];
const scope = 'backup_queue';
let isWorking = false;

/**
 * Puts an interaction in the backup queue
 * @param interaction the interaction with the channel to backup
 * @returns the length of the array which is the position in the queue
 */
export function enqueue(interaction: ChatInputCommandInteraction) {
  backupQueue.push(interaction);
  void processQueue();
  return backupQueue.length;
}

async function processQueue() {
  if (isWorking) return;

  const nextJob = backupQueue.shift();
  if (!nextJob) return;

  isWorking = true;
  try {
    await work(nextJob);
  } catch (err: any) {
    logWithTime(`Backup job failed: ${err}`, 'error', scope);
  } finally {
    isWorking = false;
    await processQueue();
  }
}

async function work(interaction: ChatInputCommandInteraction) {
  await safeEdit(interaction, 'Backup is being worked on...');
  const channel = (interaction.options.getChannel('backup_channel', false) ??
    interaction.channel) as TextChannel;

  const download = false;
  // interaction.options.getBoolean('download_attachments', false) ?? false; // ? will temporarily be off until I can find a proper file host solution

  const protect = interaction.options.getBoolean('password', false) ?? false;

  logWithTime(
    `Started backup for user: ${interaction.user.globalName} (${interaction.user.id}) for channel: ${channel.id}`,
    'info',
    scope,
  );

  const backupDir = download
    ? `./backups/${channel.id}_attachments`
    : `./backups/${channel.id}`;
  const zipPath = `${backupDir}.zip`;
  const attachmentsDir = path.join(backupDir, 'attachments');

  // ensure folder(s) exists
  fs.mkdirSync(backupDir, { recursive: true });
  if (download) fs.mkdirSync(attachmentsDir, { recursive: true });

  await copyTemplateFiles('./template', backupDir);

  const messages: any[] = [];
  let lastId: string | undefined;
  let hasMore = true;
  let totalMessages = 0;

  while (hasMore) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      before: lastId,
    });

    if (fetched.size === 0) {
      hasMore = false;
      break;
    }

    for (const msg of fetched.values()) {
      totalMessages++;
      const attachments = msg.attachments.map((att) => {
        return {
          url: download ? `./attachments/${att.id + att.name}` : att.url,
          name: att.name,
          size: att.size,
        };
      });

      if (download && msg.attachments.size > 0) {
        for (const att of msg.attachments.values()) {
          try {
            await downloadAttachment(
              att.url,
              attachmentsDir,
              att.id + att.name,
            );
          } catch (err) {
            console.warn(`Failed to download ${att.url}:`, err);
          }
        }
      }

      messages.push({
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        author: {
          id: msg.author.id,
          username: msg.author.username,
        },
        attachments,
        embeds: msg.embeds.map((e) => ({
          title: e.title,
          description: e.description,
          fields: e.fields,
          footer: e.footer ? { text: e.footer.text } : null,
          color: e.color,
        })),
      });
    }

    lastId = fetched.last()?.id;
    // rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  const metadata = {
    backupRequester: interaction.user.globalName,
    backupRequesterId: interaction.user.id,
    serverId: channel.guild.id,
    serverName: channel.guild.name,
    channelId: channel.id,
    channelName: channel.name,
    backupCreatedAt: new Date().toISOString(),
    messageCount: totalMessages,
    includesAttachments: download,
  };

  const viewFile = path.join(backupDir, 'view.html');
  let html = await fsAsync.readFile(viewFile, 'utf-8');
  html = html
    .replace('__METADATA__', JSON.stringify(metadata, null, 2))
    .replace('__MESSAGES__', JSON.stringify(messages, null, 2));

  const outFile = path.join(backupDir, 'view.html');
  await fsAsync.writeFile(outFile, html, 'utf-8');

  let password = 'How are you seeing this?';

  if (protect) {
    password = generatePassword();
    if (process.env.ENV === 'dev') {
      console.log('zip password:\n ' + password);
    }
    await zipBackup(backupDir, zipPath, password);
  } else {
    await zipBackup(backupDir, zipPath);
  }

  try {
    await safeEdit(interaction, `Backup complete for: <#${channel.id}>`);
    const stats = await fs.promises.stat(zipPath);
    const maxSize = 8 * 1024 * 1024;

    const dm = await interaction.user.createDM();

    if (stats.size > maxSize) {
      await dm.send({
        content: `Backup for <#${channel.id}> is too large to send via Discord (size: ${(stats.size / 1024 / 1024).toFixed(2)} MB).`,
      });
    } else {
      await dm.send({
        content: `Backup for <#${channel.id}>${protect ? `\nYou can unlock the zip with: ||\`${password}\`||` : ''} `,
        files: [zipPath],
      });
    }

    logWithTime(
      `Completed backup for user: ${interaction.user.globalName} (${interaction.user.id}) for channel: ${channel.id}${protect ? `, protected with password: '${password}'` : ''}`,
      'info',
      scope,
    );
  } catch (err: any) {
    logWithTime(`Could not send backup via DM: ${err}`, 'error', scope, true);
    await safeReply(
      interaction,
      'Could not send you the backup file via DM. This is likely due to the bot not being able to DM you.',
      true,
    );
  } finally {
    try {
      if (process.env.ENV !== 'dev') {
        await fsAsync.unlink(zipPath);
      }
    } catch (err: any) {
      logWithTime(
        `Failed to remove temporary zip: ${err}`,
        'error',
        scope,
        true,
      );
    }
  }
}

/**
 * Downloads a single attachment to disk
 */
async function downloadAttachment(
  url: string,
  destDir: string,
  filename: string,
) {
  await fsAsync.mkdir(destDir, { recursive: true });

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(
      `Failed to download ${url}: ${res.status} ${res.statusText}`,
    );
  }

  const filePath = path.join(destDir, filename);

  const handle = await fsAsync.open(filePath, 'w');
  try {
    await pipeline(res.body, handle.createWriteStream());
  } finally {
    await handle.close();
  }

  return filePath;
}

/**
 * Copies template files into the backup folder
 */
async function copyTemplateFiles(srcDir: string, destDir: string) {
  try {
    await fsAsync.access(srcDir);
  } catch {
    return;
  }

  const files = await fsAsync.readdir(srcDir);

  await Promise.all(
    files.map(async (file) => {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      await fsAsync.copyFile(srcPath, destPath);
    }),
  );
}

/**
 * Zips the provided dir to the output path, with an optional password
 */
async function zipBackup(
  sourceDir: string,
  outPath: string,
  password?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);

    const compressionLevel = 9;
    const encryptionMethod = 'aes256';
    let archive: archiver.Archiver;

    if (!password) {
      archive = archiver.create('zip', { zlib: { level: compressionLevel } });
    } else {
      archive = archiver.create('zip-encrypted', {
        zlib: { level: compressionLevel },
        encryptionMethod,
        password,
      } as unknown as ArchiverOptions);
    }

    output.on('close', () => resolve());
    archive.on('error', (err: Error) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

/**
 * Generates a strong password
 *
 * @param length length of the password
 * @returns a secure password
 */
function generatePassword(length = 24): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=';
  return Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => charset[x % charset.length])
    .join('');
}
