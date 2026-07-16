require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
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
      command.category = folder;
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

// Helper pour l'attribution des rôles réaction selon le mode
const handleRoleModeAssignment = async (interaction, roleId, messageId) => {
  const { db } = require('./database/db');
  const member = interaction.member;
  const guild = interaction.guild;
  const botMember = guild.members.me;
  const role = guild.roles.cache.get(roleId);

  if (!role) {
    return interaction.editReply({ content: '❌ Ce rôle n\'existe plus sur ce serveur.' });
  }

  if (role.position >= botMember.roles.highest.position) {
    return interaction.editReply({ content: '❌ Je n\'ai pas les permissions suffisantes pour gérer ce rôle (le rôle est au-dessus de mon rôle le plus élevé).' });
  }

  const embedRule = db.prepare('SELECT mode FROM autorole_embeds WHERE message_id = ?').get(messageId);
  const mode = embedRule ? embedRule.mode : 'normal';

  try {
    if (mode === 'unique') {
      // Retirer tous les autres rôles configurés sur ce message
      const allOptions = db.prepare('SELECT role_id FROM autorole_options WHERE message_id = ?').all(messageId);
      const rolesToRemove = allOptions.map(o => o.role_id).filter(r => r !== roleId && member.roles.cache.has(r));
      
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove);
      }
      if (!member.roles.cache.has(roleId)) {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✅ Rôle **${role.name}** attribué (les autres rôles associés ont été retirés).` });
      } else {
        return interaction.editReply({ content: `Vous possédez déjà le rôle **${role.name}**.` });
      }
    }

    if (mode === 'verify') { // définitif
      if (member.roles.cache.has(roleId)) {
        return interaction.editReply({ content: `Vous possédez déjà le rôle **${role.name}** (mode définitif).` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✅ Rôle **${role.name}** vous a été attribué définitivement.` });
      }
    }

    if (mode === 'reversed') { // inversé
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été retiré (mode inversé).` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été attribué (mode inversé).` });
      }
    }

    // mode normal (bascule)
    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été retiré.` });
    } else {
      await member.roles.add(roleId);
      return interaction.editReply({ content: `✅ Le rôle **${role.name}** vous a été attribué.` });
    }
  } catch (err) {
    console.error('Erreur attribution rôle:', err);
    return interaction.editReply({ content: '❌ Une erreur est survenue lors de la mise à jour de vos rôles.' });
  }
};

// Événement d'interaction (Slash Commands)
client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('autorole_')) {
      const roleId = customId.split('_')[1];
      if (!roleId) return;

      try {
        await interaction.deferReply({ ephemeral: true });
        await handleRoleModeAssignment(interaction, roleId, interaction.message.id);
      } catch (err) {
        console.error('Erreur bouton:', err);
      }
    } else if (customId === 'reply_confession_anon') {
      try {
        const modal = new ModalBuilder()
          .setCustomId('reply_confession_modal')
          .setTitle('Répondre anonymement');

        const textInput = new TextInputBuilder()
          .setCustomId('reply_content')
          .setLabel('Votre réponse anonyme')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(1)
          .setMaxLength(1000)
          .setPlaceholder('Écrivez votre message ici...')
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(textInput);
        modal.addComponents(firstActionRow);

        await interaction.showModal(modal);
      } catch (err) {
        console.error('Erreur showModal confession:', err);
      }
      return;
    } else if (customId === 'suite_invite_btn' || customId === 'suite_exclude_btn') {
      const { getPrivateSuiteByChannel } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);
      
      if (!suite) {
        return interaction.reply({ content: '❌ Ce salon n\'est pas associé à une suite privée active.', ephemeral: true });
      }

      if (interaction.user.id !== suite.user_id) {
        return interaction.reply({ content: `❌ Seul le propriétaire de la suite (<@${suite.user_id}>) peut gérer cette suite.`, ephemeral: true });
      }

      const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const isInvite = customId === 'suite_invite_btn';
      
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(isInvite ? 'suite_invite_select' : 'suite_exclude_select')
        .setPlaceholder(isInvite ? 'Sélectionnez le membre à inviter...' : 'Sélectionnez le membre à exclure...');

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const embed = new EmbedBuilder()
        .setTitle(isInvite ? '➕ Inviter un membre' : '➖ Exclure un membre')
        .setDescription(isInvite 
          ? 'Choisissez le membre du serveur que vous souhaitez inviter dans votre suite privée.'
          : 'Choisissez le membre que vous souhaitez retirer de votre suite privée.')
        .setColor(isInvite ? '#43B581' : '#F04747');

      return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else if (customId.startsWith('av_')) {
      const choix = customId.split('_')[1]; // 'action' ou 'verite'
      const guildId = interaction.guild ? interaction.guild.id : 'DM';
      let mode = 'sfw'; // Par défaut SFW

      // Détermination automatique du mode et restrictions
      if (interaction.guild) {
        const { getActionVeriteConfig, getRandomActionVeriteItem } = require('./database/db');
        const config = getActionVeriteConfig(guildId);
        
        if (config.sfw_channel_id || config.nsfw_channel_id) {
          const isSfwAllowed = config.sfw_channel_id && interaction.channel.id === config.sfw_channel_id;
          const isNsfwAllowed = config.nsfw_channel_id && interaction.channel.id === config.nsfw_channel_id;

          if (!isSfwAllowed && !isNsfwAllowed) {
            let msg = '❌ Ce jeu ne peut être joué que dans les salons configurés :';
            if (config.sfw_channel_id) msg += `\n- SFW : <#${config.sfw_channel_id}>`;
            if (config.nsfw_channel_id) msg += `\n- NSFW : <#${config.nsfw_channel_id}>`;
            return interaction.reply({ content: msg, ephemeral: true });
          }

          if (isNsfwAllowed) {
            mode = 'nsfw';
          } else {
            mode = 'sfw';
          }
        } else {
          // Si aucun salon configuré, on se base sur la nature NSFW ou SFW du salon courant
          if (interaction.channel.nsfw) {
            mode = 'nsfw';
          } else {
            mode = 'sfw';
          }
        }
      }

      const { getRandomActionVeriteItem } = require('./database/db');
      const question = getRandomActionVeriteItem(guildId, choix, mode);

      const embed = new EmbedBuilder()
        .setTitle(`🎲 Action ou Vérité — ${choix === 'action' ? 'Action 🎬' : 'Vérité 💬'}`)
        .setDescription(`<@${interaction.user.id}>, voici ton défi :\n\n>>> **${question}**`)
        .setColor(choix === 'action' ? '#E74C3C' : '#3498DB')
        .setFooter({ text: `Mode : ${mode === 'sfw' ? 'SFW 🟢' : 'NSFW 🔞'}` })
        .setTimestamp();

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('av_action')
          .setLabel('Action 🎬')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('av_verite')
          .setLabel('Vérité 💬')
          .setStyle(ButtonStyle.Primary)
      );

      try {
        await interaction.update({ embeds: [embed], components: [row] });
      } catch (err) {
        console.error(err);
      }
      return;
    } else if (customId.startsWith('ticket_')) {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    } else if (customId === 'couleur_custom_btn') {
      const modal = new ModalBuilder()
        .setCustomId('couleur_custom_modal')
        .setTitle('Couleur Personnalisée');

      const hexInput = new TextInputBuilder()
        .setCustomId('hex_code')
        .setLabel('Code couleur HEX (ex: FF5733)')
        .setStyle(TextInputStyle.Short)
        .setMinLength(6)
        .setMaxLength(7)
        .setRequired(true)
        .setPlaceholder('#FF5733');

      const actionRow = new ActionRowBuilder().addComponents(hexInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
      return;
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'boutique_acheter') {
      const itemName = interaction.values[0];
      const command = client.commands.get('boutique');
      if (command) {
        try {
          await command.execute(interaction, itemName);
        } catch (error) {
          console.error('Erreur lors de l\'achat boutique via select menu:', error);
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: '❌ Une erreur est survenue lors de l\'achat.', ephemeral: true });
          } else {
            await interaction.reply({ content: '❌ Une erreur est survenue lors de l\'achat.', ephemeral: true });
          }
        }
      }
      return;
    } else if (interaction.customId === 'ticket_select' || interaction.customId === 'ticket_open_filtered') {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    } else if (interaction.customId === 'autorole_select_menu') {
      const roleId = interaction.values[0];
      if (!roleId) return;

      try {
        await interaction.deferReply({ ephemeral: true });
        await handleRoleModeAssignment(interaction, roleId, interaction.message.id);
      } catch (err) {
        console.error('Erreur select menu autorole:', err);
      }
      return;
    } else if (interaction.customId === 'couleur_preset_select') {
      const hex = interaction.values[0];
      await applyColorRole(interaction, hex);
      return;
    }
  }

  if (interaction.isUserSelectMenu()) {
    const customId = interaction.customId;
    if (customId === 'suite_invite_select' || customId === 'suite_exclude_select') {
      const { getPrivateSuiteByChannel } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);

      if (!suite) {
        return interaction.reply({ content: '❌ Cette suite n\'existe plus.', ephemeral: true });
      }

      if (interaction.user.id !== suite.user_id) {
        return interaction.reply({ content: '❌ Vous n\'êtes pas le propriétaire de cette suite.', ephemeral: true });
      }

      const targetId = interaction.values[0];
      const channel = interaction.channel;
      const isInvite = customId === 'suite_invite_select';

      if (targetId === interaction.user.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous cibler vous-même.', ephemeral: true });
      }

      try {
        if (isInvite) {
          await channel.permissionOverwrites.create(targetId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            EmbedLinks: true,
            AttachFiles: true
          });

          const embed = new EmbedBuilder()
            .setTitle('✅ Membre Invité')
            .setDescription(`Le membre <@${targetId}> a été ajouté à votre suite privée. Il peut désormais voir et écrire dans ce salon.`)
            .setColor('#43B581')
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });
        } else {
          await channel.permissionOverwrites.delete(targetId);

          const embed = new EmbedBuilder()
            .setTitle('❌ Membre Exclu')
            .setDescription(`Le membre <@${targetId}> a été retiré de votre suite privée. Il ne peut plus voir ce salon.`)
            .setColor('#F04747')
            .setTimestamp();

          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
      } catch (err) {
        console.error('Erreur gestion permissions suite:', err);
        return interaction.reply({ content: '❌ Impossible de modifier les permissions pour cet utilisateur. Vérifiez mes permissions.', ephemeral: true });
      }
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'couleur_custom_modal') {
      const hex = interaction.fields.getTextInputValue('hex_code');
      await applyColorRole(interaction, hex);
      return;
    } else if (interaction.customId === 'reply_confession_modal') {
      const content = interaction.fields.getTextInputValue('reply_content');
      const channel = interaction.channel; // Le thread dans lequel l'interaction a eu lieu
      
      try {
        await interaction.deferReply({ ephemeral: true });

        const embed = new EmbedBuilder()
          .setDescription(`💬 **Réponse anonyme :**\n${content}`)
          .setColor('#9B59B6')
          .setTimestamp();
        
        await channel.send({ embeds: [embed] });

        const logEmbed = new EmbedBuilder()
          .setTitle('🤫 Réponse Anonyme Logguée')
          .setDescription(`**Auteur :** <@${interaction.user.id}> (${interaction.user.tag})\n**ID de l'auteur :** ${interaction.user.id}\n**Salon :** <#${channel.id}> (Fil/Thread)\n\n**Réponse :**\n${content}`)
          .setColor('#9B59B6')
          .setTimestamp();
        
        const { sendLog } = require('./utils/helpers');
        sendLog(interaction.guild, 'confession', logEmbed);

        await interaction.editReply({ content: '✅ Votre réponse anonyme a été postée avec succès !' });
      } catch (err) {
        console.error('Erreur réponse confession modal:', err);
        await interaction.editReply({ content: '❌ Impossible d\'envoyer votre réponse anonyme.' });
      }
      return;
    } else if (interaction.customId === 'add_emoji_context_modal') {
      const name = interaction.fields.getTextInputValue('emoji_name_input').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const emojiUrl = global.emojiCache ? global.emojiCache.get(interaction.user.id) : null;

      if (!emojiUrl) {
        return interaction.reply({ content: '❌ URL de l\'émoji introuvable. Veuillez réessayer.', ephemeral: true });
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        // Télécharger l'image de l'émoji dans un Buffer
        const response = await fetch(emojiUrl);
        if (!response.ok) throw new Error(`Impossible de télécharger l'image (Status: ${response.status})`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const createdEmoji = await interaction.guild.emojis.create({
          attachment: buffer,
          name: name
        });

        if (global.emojiCache) global.emojiCache.delete(interaction.user.id);

        const embed = new EmbedBuilder()
          .setTitle('✅ Émoji Créé !')
          .setDescription(`L'émoji personnalisé **:${createdEmoji.name}:** a été ajouté avec succès au serveur !`)
          .addFields(
            { name: 'Nom', value: `\`${createdEmoji.name}\``, inline: true },
            { name: 'Rendu', value: `${createdEmoji}`, inline: true }
          )
          .setThumbnail(emojiUrl)
          .setColor('#2ecc71')
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('Erreur addemoji context:', err);
        await interaction.editReply({ content: `❌ Impossible d'ajouter l'émoji. Raison : ${err.message}` });
      }
      return;
    }
  }

  if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
    return;
  }

  const guildId = interaction.guild ? interaction.guild.id : null;

  if (guildId) {
    const { getPermissionsConfig } = require('./database/db');
    const permConfig = getPermissionsConfig(guildId);
    
    const adminRoleId = permConfig.admin_role_id;
    const modoRoleId = permConfig.modo_role_id;
    
    let subcommand = null;
    try {
      subcommand = interaction.options.getSubcommand(false);
    } catch (e) {}

    const isAllowedForEveryone = 
      command.category === 'actions' ||
      ['action-verite', 'niveau', 'solde', 'karma', 'loc', 'proche', 'boutique', 'leaderboard', 'confess', 'deposit', 'withdraw', 'lovecalc', 'mot-cache'].includes(interaction.commandName);
      
    if (!isAllowedForEveryone) {
      const { PermissionsBitField } = require('discord.js');
      const member = interaction.member;
      const isUserAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
      
      const hasAllowedRole = 
        isUserAdmin || 
        (adminRoleId && member.roles.cache.has(adminRoleId)) || 
        (modoRoleId && member.roles.cache.has(modoRoleId));
        
      if (!hasAllowedRole) {
        return interaction.reply({
          content: "❌ Cette commande est réservée aux Administrateurs et Modérateurs.",
          ephemeral: true
        });
      }
    }
  }

  const userId = interaction.user.id;
  const oldKarma = guildId ? (require('./database/db').getEconomy(guildId, userId)?.karma || 0) : 0;

  try {
    await command.execute(interaction);

    if (guildId) {
      const newEco = require('./database/db').getEconomy(guildId, userId);
      const newKarma = newEco ? newEco.karma : 0;
      if (newKarma !== oldKarma) {
        await checkAndAnnounceKarmaReward(interaction, oldKarma, newKarma);
      }
    }
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Une erreur est survenue lors de l\'exécution de cette commande.', ephemeral: true });
    }
  }
});

async function checkAndAnnounceKarmaReward(interaction, oldKarma, newKarma) {
  const guildId = interaction.guild ? interaction.guild.id : null;
  if (!guildId) return;

  const { getKarmaConfig } = require('./database/db');
  const config = getKarmaConfig(guildId);

  // Si le système de karma ou les annonces sont désactivés
  if (!config.is_active || !config.announce_rewards) return;

  const userId = interaction.user.id;
  const channel = interaction.channel;
  if (!channel) return;

  // Seuil 1
  if (oldKarma < config.threshold_1 && newKarma >= config.threshold_1) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_1}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_1}**\n🛒 Réduction boutique : **-${config.discount_1}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
  // Seuil 2
  else if (oldKarma < config.threshold_2 && newKarma >= config.threshold_2) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_2}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_2}**\n🛒 Réduction boutique : **-${config.discount_2}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
  // Seuil 3
  else if (oldKarma < config.threshold_3 && newKarma >= config.threshold_3) {
    const text = `🎉 **Félicitations <@${userId}> !** Tu as atteint le rang de Karma **${config.threshold_3}** et débloqué les avantages :\n⚡ Multiplicateur d'XP : **x${config.xp_mult_3}**\n🛒 Réduction boutique : **-${config.discount_3}%** !`;
    await channel.send({ content: text }).catch(() => null);
  }
}

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

    // Déploiement instantané dans les guilds (évite le cache Discord global de 1 heure)
    for (const [guildId, guild] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: commandsJSON }
      ).catch(e => console.error(`[REST] Erreur d'enregistrement instantané dans la guild ${guild.name}:`, e));
    }

    console.log('Commandes d\'application (/) enregistrées avec succès.');
    
    // Nettoyage automatique des suites privées toutes les 60 secondes
    setInterval(() => checkExpiredSuites(client), 60000);
    checkExpiredSuites(client);

    // Mettre en cache tous les membres de tous les serveurs au démarrage
    client.guilds.cache.forEach(guild => {
      guild.members.fetch()
        .then(() => console.log(`[Cache] Membres de ${guild.name} mis en cache.`))
        .catch(err => console.error(`[Cache] Impossible de mettre en cache les membres de ${guild.name}:`, err));
    });

    // Scan et réouverture des forums illimités au démarrage
    const { scanAndReopenAllUnlimitedForums } = require('./utils/forums');
    scanAndReopenAllUnlimitedForums(client).catch(console.error);
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
    const { guildId, channelId, title, description, color, thumbnail, imageUrl, options, type = 'buttons', mode = 'normal', existingMessageId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    let message;
    if (existingMessageId) {
      message = await channel.messages.fetch(existingMessageId).catch(() => null);
      if (!message) return res.status(404).json({ error: 'Message existant introuvable dans ce salon' });
    }

    const { StringSelectMenuBuilder } = require('discord.js');
    let row;
    
    if (type === 'buttons') {
      if (options.length > 0) {
        row = new ActionRowBuilder();
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
      }
    } else if (type === 'select') {
      if (options.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId('autorole_select_menu')
          .setPlaceholder('Sélectionnez un rôle...');

        const selectOptions = options.map(opt => {
          const optionObj = {
            label: opt.label || 'Rôle',
            value: opt.role_id
          };
          if (opt.emoji) optionObj.emoji = opt.emoji;
          return optionObj;
        });
        selectMenu.addOptions(selectOptions);
        row = new ActionRowBuilder().addComponents(selectMenu);
      }
    }

    if (existingMessageId) {
      const editPayload = {};
      if (row) {
        editPayload.components = [row];
      } else {
        editPayload.components = [];
      }
      
      await message.edit(editPayload);

      if (type === 'reactions') {
        for (const opt of options) {
          if (opt.emoji) {
            await message.react(opt.emoji).catch(console.error);
          }
        }
      }

      return res.json({ success: true, messageId: message.id });
    } else {
      const embed = new EmbedBuilder()
        .setTitle(title || 'Choix des Rôles')
        .setDescription(description || 'Cliquez sur les options ci-dessous pour obtenir ou retirer des rôles.')
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

      const payload = { embeds: [embed] };
      if (files.length > 0) payload.files = files;
      if (row) payload.components = [row];

      const newMessage = await channel.send(payload);

      if (type === 'reactions') {
        for (const opt of options) {
          if (opt.emoji) {
            await newMessage.react(opt.emoji).catch(console.error);
          }
        }
      }

      return res.json({ success: true, messageId: newMessage.id });
    }
  } catch (error) {
    console.error('Error sending/editing autorole:', error);
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
    const sortedChannels = [...guild.channels.cache.values()]
      .sort((a, b) => (a.rawPosition || 0) - (b.rawPosition || 0));
    const channels = sortedChannels.map(channel => ({
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
    const sortedRoles = [...guild.roles.cache.values()]
      .sort((a, b) => b.position - a.position);
    const roles = sortedRoles.map(role => ({
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
apiApp.get('/guilds/:guildId/members', async (req, res) => {
  try {
    const guild = client.guilds.cache.get(req.params.guildId);
    if (!guild) {
      return res.status(404).json({ error: 'Guild not found' });
    }
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const sortedMembers = [...members.values()]
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    const result = sortedMembers.map(m => ({
      id: m.id,
      name: m.user.tag,
      displayName: m.displayName
    }));
    res.json(result);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Error fetching members' });
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

async function applyColorRole(interaction, hexColor) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const { db } = require('./database/db');

  let hex = hexColor.trim().replace('#', '').toUpperCase();
  if (!/^[0-9A-F]{6}$/i.test(hex)) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Code couleur HEX invalide. Format attendu : `#FF5733` ou `FF5733`.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Code couleur HEX invalide. Format attendu : `#FF5733` ou `FF5733`.', ephemeral: true });
      }
    } catch (_) {}
    return;
  }

  if (hex === '000000') hex = '000001';

  const invItem = db.prepare("SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%rôle couleur%'").get(guildId, userId);
  if (!invItem || invItem.quantity <= 0) {
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ Vous ne possédez plus l\'article **🌈 Rôle couleur** dans votre inventaire.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ Vous ne possédez plus l\'article **🌈 Rôle couleur** dans votre inventaire.', ephemeral: true });
      }
    } catch (_) {}
    return;
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);
  }

  const member = interaction.member;
  const guild = interaction.guild;
  const botMember = guild.members.me;

  const roleName = `Couleur #${hex}`;
  let role = guild.roles.cache.find(r => r.name === roleName);
  
  if (!role) {
    try {
      role = await guild.roles.create({
        name: roleName,
        color: `#${hex}`,
        reason: `Couleur de pseudo pour ${member.user.username}`
      });
      
      if (botMember.roles.highest.position > 1) {
        await role.setPosition(botMember.roles.highest.position - 1).catch(() => null);
      }
    } catch (err) {
      console.error('Failed to create role:', err);
      return interaction.editReply({ content: '❌ Impossible de créer le rôle de couleur. Vérifiez les permissions de mon rôle le plus élevé.' }).catch(() => null);
    }
  }

  const colorRoles = member.roles.cache.filter(r => r.name.startsWith('Couleur #'));
  for (const [rId, r] of colorRoles) {
    if (rId !== role.id) {
      await member.roles.remove(r).catch(console.error);
    }
  }

  try {
    await member.roles.add(role);
  } catch (err) {
    console.error('Failed to assign role:', err);
    return interaction.editReply({ content: '❌ Je n\'ai pas pu vous attribuer le rôle. Assurez-vous que le rôle créé n\'est pas au-dessus de mon rôle le plus élevé.' }).catch(() => null);
  }

  if (invItem.quantity > 1) {
    db.prepare("UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?")
      .run(guildId, userId, invItem.item_name);
  } else {
    db.prepare("DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?")
      .run(guildId, userId, invItem.item_name);
  }

  setTimeout(async () => {
    try {
      guild.roles.cache.filter(r => r.name.startsWith('Couleur #') && r.members.size === 0).forEach(async r => {
        await r.delete().catch(() => null);
      });
    } catch (_) {}
  }, 10000);

  return interaction.editReply({ content: `🎨 **Couleur appliquée avec succès !** Votre pseudo s'affiche désormais en **#${hex}**.` }).catch(() => null);
}

// Connexion du bot
client.login(process.env.DISCORD_TOKEN);

module.exports = { client };

// Lancement du Dashboard Premium
require('./dashboard');
