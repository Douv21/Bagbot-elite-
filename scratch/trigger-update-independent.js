require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { getTicketPanel } = require('../src/database/db');
const { sendOrUpdateTicketPanel } = require('../src/utils/tickets');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log('Client is ready. Waiting 5 seconds for cache...');
  setTimeout(async () => {
    const guildId = '1360897918504271882';
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      console.error('Guild still not found in cache. Listing cached guilds:');
      console.log(client.guilds.cache.map(g => `${g.name} (${g.id})`));
      process.exit(1);
    }
    console.log('Guild found:', guild.name);
    try {
      const res = await sendOrUpdateTicketPanel(guildId, client);
      console.log('Result:', res);
    } catch (err) {
      console.error('Error:', err);
    }
    process.exit(0);
  }, 5000);
});

client.login(process.env.DISCORD_TOKEN);
