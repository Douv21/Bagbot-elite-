require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { getTicketPanel } = require('../src/database/db');
const { sendOrUpdateTicketPanel } = require('../src/utils/tickets');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

client.once('ready', async () => {
  console.log('Client is ready, testing ticket panel edit...');
  const guildId = '1360897918504271882';
  try {
    const res = await sendOrUpdateTicketPanel(guildId, client);
    console.log('Result:', res);
  } catch (err) {
    console.error('Fatal error during test-edit:', err);
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
