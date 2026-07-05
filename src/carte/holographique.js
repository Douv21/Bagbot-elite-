// holographique.js — thin launcher.
// All canvas work runs in card-worker.js (child process).
// If canvas causes SIGILL on this machine, only the child dies; the bot survives.

const { spawn }             = require('child_process');
const path                  = require('path');
const { AttachmentBuilder } = require('discord.js');

const WORKER     = path.join(__dirname, 'card-worker.js');
const TIMEOUT_MS = 20_000;

module.exports = async (member, data, theme) => {
  try {
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 512 });

    const payload = JSON.stringify({
      username:      member.user.username,
      discriminator: member.user.discriminator,
      avatarUrl,
      data,
      theme: theme || 'holographique'
    });

    const buf = await new Promise((resolve, reject) => {
      const child  = spawn(process.execPath, [WORKER], { stdio: ['pipe','pipe','pipe'] });
      const chunks = [];

      child.stdout.on('data', c => chunks.push(c));
      child.stderr.on('data', d => process.stderr.write('[card-worker] ' + d));

      child.on('close', code => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error(`card-worker exited with code ${code}`));
        }
      });
      child.on('error', reject);

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('card-worker timeout'));
      }, TIMEOUT_MS);
      child.on('close', () => clearTimeout(timer));

      child.stdin.write(payload);
      child.stdin.end();
    });

    return new AttachmentBuilder(buf, { name: 'niveau-card.jpg' });
  } catch (err) {
    console.error('❌ Carte indisponible:', err.message);
    return null;
  }
};
