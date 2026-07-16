require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { getTicketPanel } = require('../src/database/db');
const { sendOrUpdateTicketPanel } = require('../src/utils/tickets');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log('Client is ready. Cached guilds:');
  client.guilds.cache.forEach(g => {
    console.log(`- ${g.name} (${g.id})`);
  });
  
  const guildIds = client.guilds.cache.map(g => g.id);
  for (const guildId of guildIds) {
    console.log(`\n--- Updating ticket panel for guild: ${guildId} ---`);
    try {
      const res = await sendOrUpdateTicketPanel(guildId, client);
      console.log(`Result for ${guildId}:`, res);
    } catch (err) {
      console.error(`Error for ${guildId}:`, err);
    }
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
