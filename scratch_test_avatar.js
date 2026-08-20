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

async function testGuildAvatar() {
  try {
    const guilds = await rest.get(Routes.userGuilds());
    if (!guilds || !guilds.length) {
      console.log('No guilds found');
      return;
    }
    const guildId = guilds[0].id;
    console.log('Testing guild:', guildId, guilds[0].name);

    // Test patching avatar on guild member @me
    // Create a tiny 1x1 png data uri
    const tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    try {
      const res = await rest.patch(Routes.guildMember(guildId, '@me'), {
        body: { avatar: tinyPng }
      });
      console.log('Guild member avatar patch SUCCESS:', res.avatar);
    } catch (err) {
      console.log('Guild member avatar patch FAILED:', err.status, err.message, err.rawError);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testGuildAvatar();
