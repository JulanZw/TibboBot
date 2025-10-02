import { createCanvas, loadImage } from 'canvas';
import { AttachmentBuilder } from 'discord.js';

import { logWithTime } from './logging.ts';

export async function generateLeaderboard(
  users: {
    username: string;
    number1: bigint;
    number2?: bigint;
    avatar?: string | null;
  }[],
  scope: string,
  customText?: string,
) {
  const width = 900;
  const height = 100 + Math.min(users.length, 10) * 60;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Sans';
  ctx.fillText(customText ? customText : 'Leaderboard', width / 2 - 150, 50);

  const allPoints: number[] = [];
  for (const u of users) {
    allPoints.push(Number(u.number1));
    if (u.number2 != null) allPoints.push(Number(u.number2));
  }
  const maxPoints = Math.max(...allPoints);
  const barMaxWidth = 500;

  for (let i = 0; i < Math.min(users.length, 10); i++) {
    const user = users[i];
    const y = 100 + i * 60;

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(50, y + 20, 20, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    if (user.avatar) {
      try {
        const avatar = await loadImage(user.avatar);
        ctx.drawImage(avatar, 30, y, 40, 40);
      } catch {
        logWithTime(
          `Avatar failed to load for user: ${user.username} while building leaderboard`,
          'warn',
          scope,
        );
      }
    }
    ctx.restore();

    // Username
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Sans';
    ctx.fillText(user.username, 90, y + 28);

    // First bar
    const barWidth1 = (Number(user.number1) / maxPoints) * barMaxWidth;
    ctx.fillStyle = '#3F48CC';
    ctx.fillRect(300, y + 5, barWidth1, user.number2 ? 15 : 30);

    // Points text for number1
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Sans';
    ctx.fillText(
      `${user.number1}`,
      310 + barWidth1,
      y + (user.number2 ? 18 : 25),
    );

    // Second bar (if needed)
    if (user.number2) {
      const barWidth2 = (Number(user.number2) / maxPoints) * barMaxWidth;
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(300, y + 22, barWidth2, 15);

      // Points text for number2
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${user.number2}`, 310 + barWidth2, y + 35);
    }
  }

  return new AttachmentBuilder(canvas.toBuffer(), { name: 'leaderboard.png' });
}
