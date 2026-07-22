require('dotenv').config();
const { processAiCommand } = require('./src/utils/aiAssistant');
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log('Client ready!');
  const guild = client.guilds.cache.first();
  if (!guild) {
    console.error('No guild found!');
    process.exit(1);
  }

  console.log(`Testing processAiCommand on guild "${guild.name}" (${guild.id})...`);
  try {
    const res = await processAiCommand(guild.id, guild.ownerId, 'Bonjour, présente-toi brièvement.', client);
    console.log('RESULT SUCCESS:\n', res);
  } catch (err) {
    console.error('RESULT FAILED:\n', err);
  }
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
