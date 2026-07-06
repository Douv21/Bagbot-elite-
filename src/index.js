require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('autorole_')) {
      const roleId = customId.split('_')[1];
      if (!roleId) return;

      try {
        await interaction.deferReply({ ephemeral: true });
        const member = interaction.member;
        const role = interaction.guild.roles.cache.get(roleId);
        
        if (!role) {
          return interaction.editReply({ content: '❌ Ce rôle n\'existe plus sur ce serveur.' });
        }

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
          return interaction.editReply({ content: '❌ Je n\'ai pas les permissions suffisantes pour vous attribuer ce rôle (le rôle est au-dessus de mon rôle le plus élevé).' });
        }

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          await interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été retiré.` });
        } else {
          await member.roles.add(roleId);
          await interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été attribué.` });
        }
      } catch (err) {
        console.error('Erreur attribution rôle bouton:', err);
        await interaction.editReply({ content: '❌ Une erreur est survenue lors de la mise à jour de vos rôles.' });
      }
    }
    return;
  }

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
    
    // Nettoyage automatique des suites privées toutes les 60 secondes
    setInterval(() => checkExpiredSuites(client), 60000);
    checkExpiredSuites(client);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
  }
});

// API server pour exposer les guilds du bot
const express = require('express');
const apiApp = express();
const API_PORT = process.env.BOT_API_PORT || 49602;

apiApp.use(express.json());

apiApp.get('/bot/info', (req, res) => {
  if (!client.user) {
    return res.status(503).json({ error: 'Bot not ready' });
  }
  res.json({
    username: client.user.username,
    avatarURL: client.user.displayAvatarURL({ dynamic: true })
  });
});

apiApp.post('/bot/avatar', async (req, res) => {
  try {
    const { avatar_url } = req.body;
    if (!avatar_url) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }
    let resolvedPath = avatar_url;
    if (avatar_url.startsWith('/uploads/')) {
      resolvedPath = path.join(__dirname, '../public', avatar_url);
    }
    await client.user.setAvatar(resolvedPath);
    res.json({ success: true, avatarURL: client.user.displayAvatarURL({ dynamic: true }) });
  } catch (error) {
    console.error('Error setting bot avatar:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/send-autorole', async (req, res) => {
  try {
    const { guildId, channelId, title, description, color, thumbnail, imageUrl, options } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const embed = new EmbedBuilder()
      .setTitle(title || 'Choix des Rôles')
      .setDescription(description || 'Cliquez sur les boutons ci-dessous pour obtenir ou retirer des rôles.')
      .setColor(color || '#5865F2')
      .setTimestamp();
    
    if (thumbnail) {
      embed.setThumbnail(guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png');
    }
    
    const files = [];
    if (imageUrl) {
      if (imageUrl.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../public', imageUrl);
        if (fs.existsSync(absPath)) {
          const name = path.basename(imageUrl);
          files.push(new AttachmentBuilder(absPath, { name }));
          embed.setImage(`attachment://${name}`);
        }
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        embed.setImage(imageUrl);
      }
    }

    const row = new ActionRowBuilder();
    options.forEach(opt => {
      let styleCode = ButtonStyle.Primary;
      if (opt.style === 'SECONDARY') styleCode = ButtonStyle.Secondary;
      else if (opt.style === 'SUCCESS') styleCode = ButtonStyle.Success;
      else if (opt.style === 'DANGER') styleCode = ButtonStyle.Danger;

      const btn = new ButtonBuilder()
        .setCustomId(`autorole_${opt.role_id}`)
        .setLabel(opt.label || 'Rôle')
        .setStyle(styleCode);
      if (opt.emoji) btn.setEmoji(opt.emoji);
      row.addComponents(btn);
    });

    const payload = { embeds: [embed] };
    if (files.length > 0) payload.files = files;
    if (options.length > 0) payload.components = [row];

    const message = await channel.send(payload);
    res.json({ success: true, messageId: message.id });
  } catch (error) {
    console.error('Error sending autorole embed:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/delete-message', async (req, res) => {
  try {
    const { guildId, channelId, messageId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (message) {
      await message.delete();
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message });
  }
});

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

async function checkExpiredSuites(client) {
  try {
    const now = Date.now();
    const { getAllPrivateSuites, deletePrivateSuite } = require('./database/db');
    const suites = getAllPrivateSuites();
    
    for (const suite of suites) {
      if (suite.expires_at <= now) {
        const guild = client.guilds.cache.get(suite.guild_id);
        if (guild) {
          const txtChan = guild.channels.cache.get(suite.text_channel_id);
          const vcChan = guild.channels.cache.get(suite.voice_channel_id);

          if (txtChan) {
            await txtChan.send('⏳ **Cette suite privée a expiré et va être supprimée...**').catch(() => {});
            setTimeout(async () => {
              await txtChan.delete().catch(() => {});
            }, 5000);
          }
          if (vcChan) {
            await vcChan.delete().catch(() => {});
          }

          const user = await client.users.fetch(suite.user_id).catch(() => null);
          if (user) {
            await user.send(`⏳ Votre suite privée sur le serveur **${guild.name}** a expiré et ses salons ont été supprimés.`).catch(() => {});
          }
        }

        deletePrivateSuite(suite.guild_id, suite.user_id);
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage suites privées:', err);
  }
}

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

// Lancement du Dashboard Premium
require('./dashboard');
