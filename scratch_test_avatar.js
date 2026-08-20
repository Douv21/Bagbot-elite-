const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.log('No DISCORD_TOKEN found in .env');
  process.exit(0);
}

const rest = new REST({ version: '10' }).setToken(token);

async function resetGuildAvatars() {
  try {
    const guilds = await rest.get(Routes.userGuilds());
    if (!guilds || !guilds.length) {
      console.log('No guilds found');
      return;
    }
    for (const g of guilds) {
      console.log('Resetting guild member avatar for:', g.id, g.name);
      await rest.patch(Routes.guildMember(g.id, '@me'), { body: { avatar: null } }).catch(err => {
        console.error('Failed to reset:', err.message);
      });
    }
    console.log('All guild member avatars reset successfully.');
  } catch (err) {
    console.error('Error:', err);
  }
}

resetGuildAvatars();
