import fsAsync from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

import fetch from 'node-fetch';
import { TextChannel, ChatInputCommandInteraction, Guild } from 'discord.js';

const backupQueue: ChatInputCommandInteraction[] = [];
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
  } catch (err) {
    console.error('Backup job failed:', err);
  } finally {
    isWorking = false;
    await processQueue();
  }
}

async function work(interaction: ChatInputCommandInteraction) {
  const channel = (interaction.options.getChannel('backup_channel', false) ??
    interaction.channel) as TextChannel;

  const download =
    interaction.options.getBoolean('download_attachments', false) ?? false;

  const backupDir = download
    ? `./backups/${channel.id}_attachments`
    : `./backups/${channel.id}`;
  const filePath = path.join(backupDir, 'messages.json');
  const attachmentsDir = path.join(backupDir, 'attachments');

  // ensure folder(s) exists
  fs.mkdirSync(backupDir, { recursive: true });
  if (download) fs.mkdirSync(attachmentsDir, { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: 'w' });
  stream.write('[\n');

  let lastId: string | undefined;
  let hasMore = true;
  let isFirst = true;
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
          url: download ? `./attachments/${att.name}` : att.url,
          name: att.name,
          size: att.size,
        };
      });

      if (download && msg.attachments.size > 0) {
        for (const att of msg.attachments.values()) {
          try {
            await downloadAttachment(att.url, attachmentsDir, att.name);
          } catch (err) {
            console.warn(`Failed to download ${att.url}:`, err);
          }
        }
      }

      const entry = {
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
      };

      if (!isFirst) stream.write(',\n');
      stream.write(JSON.stringify(entry, null, 2));
      isFirst = false;
    }

    lastId = fetched.last()?.id;
    await new Promise((r) => setTimeout(r, 1000)); // rate limit
  }

  stream.write('\n]\n');
  stream.end();

  await copyTemplateFiles('./template', backupDir);

  await writeMetadata(
    channel.guild,
    channel,
    backupDir,
    totalMessages,
    download,
  );

  await interaction.editReply({
    content: `Backup complete: \`${filePath}\``,
  });
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
 * Writes a metadata.json file to the given backup folder
 */
async function writeMetadata(
  guild: Guild,
  channel: TextChannel,
  backupDir: string,
  messageCount: number,
  includesAttachments: boolean,
) {
  const metadata = {
    serverId: guild.id,
    serverName: guild.name,
    channelId: channel.id,
    channelName: channel.name,
    backupCreatedAt: new Date().toISOString(),
    messageCount,
    includesAttachments,
  };

  const filePath = path.join(backupDir, 'metadata.json');
  await fsAsync.writeFile(filePath, JSON.stringify(metadata, null, 2), 'utf-8');
}
