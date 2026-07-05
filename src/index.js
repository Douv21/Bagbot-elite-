require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./database/db');

// Initialiser la base de données
initDatabase();

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ]
});

client.commands = new Collection();

// Charger les commandes
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.existsSync(commandsPath) ? fs.readdirSync(commandsPath) : [];
const commandsJSON = [];

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = path.join(folderPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      commandsJSON.push(command.data.toJSON());
    } else {
      console.log(`[AVERTISSEMENT] La commande à ${filePath} manque de propriétés "data" ou "execute" requises.`);
    }
  }
}

// Charger les événements
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.existsSync(eventsPath) ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js')) : [];

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Événement d'interaction (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    }
  }
});

// Enregistrer les commandes slash auprès de Discord lors de la connexion
client.once('ready', async () => {
  console.log(`Connecté en tant que ${client.user.tag}!`);
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log(`Début du rafraîchissement des ${commandsJSON.length} commandes d'application (/)`);
    
    // Déploiement global des commandes
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsJSON }
    );

    console.log('Commandes d\'application (/) enregistrées avec succès.');
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
  }
});

// API server pour exposer les guilds du bot
const express = require('express');
const apiApp = express();
const API_PORT = process.env.BOT_API_PORT || 49502;

apiApp.get('/guilds', (req, res) => {
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon
  }));
  res.json(guilds);
});

apiApp.get('/guilds/:guildId/channels', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    await guild.channels.fetch();
    const channels = guild.channels.cache.map(channel => ({
      id: channel.id,
      name: channel.name || 'Unknown',
      type: channel.type
    }));
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Error fetching channels' });
  }
});

apiApp.get('/guilds/:guildId/roles', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    await guild.roles.fetch();
    const roles = guild.roles.cache.map(role => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position
    }));
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Error fetching roles' });
  }
});

apiApp.listen(API_PORT, '127.0.0.1', () => {
  console.log(`✓ Bot Local API running on port ${API_PORT}`);
});

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

// Lancement du Dashboard Premium
require('./dashboard');
