import fs from 'fs';

import { TextChannel, ChatInputCommandInteraction } from 'discord.js';

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
  const channel = interaction.channel as TextChannel;
  const filePath = `./backups/${channel.id}.json`;

  // ensure backups folder exists
  fs.mkdirSync('./backups', { recursive: true });

  const stream = fs.createWriteStream(filePath, { flags: 'w' });
  stream.write('[\n');

  let lastId: string | undefined;
  let hasMore = true;
  let isFirst = true;

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
      const entry = {
        id: msg.id,
        content: msg.content,
        createdAt: msg.createdAt,
        author: {
          id: msg.author.id,
          username: msg.author.username,
        },
        attachments: msg.attachments.map((att) => ({
          url: att.url,
          name: att.name,
          size: att.size,
        })),
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

  await interaction.editReply({
    content: `Backup complete: \`${filePath}\``,
  });
}
