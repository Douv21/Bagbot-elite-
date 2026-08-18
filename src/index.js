require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, REST, Routes, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, UserSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
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
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites
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

// Initialiser le cache des invitations au démarrage et à la création/suppression
client.once('ready', () => {
  const { initInviteCache } = require('./utils/inviteTracker');
  initInviteCache(client).catch(console.error);
});

client.on('inviteCreate', invite => {
  const { refreshGuildInvites } = require('./utils/inviteTracker');
  refreshGuildInvites(invite.guild).catch(console.error);
});

client.on('inviteDelete', invite => {
  const { refreshGuildInvites } = require('./utils/inviteTracker');
  refreshGuildInvites(invite.guild).catch(console.error);
});

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
  // Prise en charge directe des boutons, sélecteurs et modaux du Tribunal
  if (interaction.customId && (interaction.customId.startsWith('tribunal:') || interaction.customId.startsWith('tribunal_case:'))) {
    const tribunalCmd = client.commands.get('tribunal');
    if (tribunalCmd && typeof tribunalCmd.handleInteraction === 'function') {
      try {
        const handled = await tribunalCmd.handleInteraction(interaction);
        if (handled) return;
      } catch (err) {
        console.error('Erreur interaction tribunal:', err);
      }
    }
  }

  // Prise en charge directe des boutons, sélecteurs et modaux du Jeu UNO
  if (interaction.customId && (interaction.customId.startsWith('uno:') || interaction.customId.startsWith('uno_'))) {
    const unoCmd = client.commands.get('uno');
    if (unoCmd && typeof unoCmd.handleInteraction === 'function') {
      try {
        const handled = await unoCmd.handleInteraction(interaction);
        if (handled) return;
      } catch (err) {
        console.error('Erreur interaction UNO:', err);
      }
    }
  }

  // Prise en charge directe des boutons et modaux de Sondage / Évaluations
  if (interaction.customId && interaction.customId.startsWith('sondage_')) {
    const { handleSondageInteraction } = require('./utils/sondageHandler');
    try {
      const handled = await handleSondageInteraction(interaction);
      if (handled) return;
    } catch (err) {
      console.error('Erreur interaction sondage:', err);
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;

    if (customId.startsWith('boutique_buy_self:')) {
      const itemName = customId.replace('boutique_buy_self:', '');
      const boutiqueCmd = client.commands.get('boutique');
      if (boutiqueCmd && boutiqueCmd.processPurchase) {
        await boutiqueCmd.processPurchase(interaction, itemName, interaction.user.id);
      }
      return;
    } else if (customId.startsWith('boutique_gift_target:')) {
      const itemName = customId.replace('boutique_gift_target:', '');
      const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`boutique_gift_select:${itemName}`)
        .setPlaceholder('🎁 Sélectionnez le membre chanceux à qui offrir ce cadeau...')
        .setMinValues(1)
        .setMaxValues(1);

      const row = new ActionRowBuilder().addComponents(userSelect);
      return interaction.reply({
        content: `🎁 **Offrir : ${itemName}**\nSélectionnez ci-dessous le membre du serveur qui recevra votre cadeau :`,
        components: [row],
        ephemeral: true
      });
    } else if (customId.startsWith('counting_')) {
      const parts = customId.split(':');
      const action = parts[0];
      const channelId = parts[1];
      const targetUserId = parts[2];

      if (interaction.user.id !== targetUserId) {
        return interaction.reply({ content: '❌ Seul le membre concerné par l\'erreur de comptage peut choisir d\'utiliser sa chance.', ephemeral: true });
      }

      const pending = global.pendingCountingErrors ? global.pendingCountingErrors.get(`${channelId}:${targetUserId}`) : null;
      if (pending) {
        clearTimeout(pending.timerId);
        global.pendingCountingErrors.delete(`${channelId}:${targetUserId}`);
      }

      const { db, getCountingStats, resetCountingStats } = require('./database/db');
      const { EmbedBuilder } = require('discord.js');

      if (action === 'counting_use_chance') {
        const userChance = db.prepare("SELECT quantity, item_name FROM inventory WHERE guild_id = ? AND user_id = ? AND (item_name LIKE '%chance%comptage%' OR item_name LIKE '%joker%comptage%') AND quantity > 0").get(interaction.guildId, targetUserId);

        if (!userChance || userChance.quantity <= 0) {
          return interaction.reply({ content: '❌ Vous n\'avez plus de Chance de Comptage dans votre inventaire !', ephemeral: true });
        }

        if (userChance.quantity > 1) {
          db.prepare("UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?").run(interaction.guildId, targetUserId, userChance.item_name);
        } else {
          db.prepare("DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?").run(interaction.guildId, targetUserId, userChance.item_name);
        }

        const countingChan = db.prepare('SELECT * FROM counting_channels WHERE channel_id = ?').get(channelId);
        const remaining = userChance.quantity - 1;
        const emojiChance = countingChan ? (countingChan.emoji_chance || '🍀') : '🍀';

        const chanceEmbed = new EmbedBuilder()
          .setTitle(`${emojiChance} CHANCE DE COMPTAGE UTILISÉE !`)
          .setDescription(`<@${targetUserId}> a choisi d'utiliser **1x ${emojiChance} Chance de Comptage** de son inventaire !\n\nLe compte est préservé à **${countingChan ? countingChan.current_number : 0}**. Vous pouvez continuer à compter à partir du nombre suivant !`)
          .setColor('#2ECC71')
          .setFooter({ text: `Chances restantes pour ${interaction.user.username} : ${remaining}` })
          .setTimestamp();

        if (pending && pending.promptMsg) {
          await pending.promptMsg.react(emojiChance).catch(() => {});
        }

        await interaction.update({ embeds: [chanceEmbed], components: [] }).catch(() => null);
        return;
      } else if (action === 'counting_decline_chance') {
        await interaction.update({ content: '❌ *Réinitialisation acceptée par le membre.*', embeds: [], components: [] }).catch(() => null);
        
        const countingChan = db.prepare('SELECT * FROM counting_channels WHERE channel_id = ?').get(channelId);
        if (countingChan) {
          const stats = getCountingStats(channelId);
          const medals = ['🥇', '🥈', '🥉'];
          let leaderboardText = '*(Aucun chiffre validé dans cette session)*';
          if (stats && stats.length > 0) {
            leaderboardText = stats.map((r, i) => {
              const prefix = medals[i] || `**#${i + 1}**`;
              return `${prefix} <@${r.user_id}> — **${r.count}** nombre${r.count > 1 ? 's' : ''} validé${r.count > 1 ? 's' : ''}`;
            }).join('\n');
          }

          resetCountingStats(channelId);
          db.prepare('UPDATE counting_channels SET current_number = start_number, last_user_id = NULL WHERE channel_id = ?').run(channelId);

          const emojiError = countingChan.emoji_error || '❌';
          const errorEmbed = new EmbedBuilder()
            .setTitle('💥 ERREUR DE COMPTAGE !')
            .setDescription(`Le compte a été réinitialisé à **${countingChan.start_number}** !`)
            .addFields({ name: '📊 Classement de la session (Top Participants)', value: leaderboardText })
            .setColor('#E74C3C')
            .setTimestamp();

          await interaction.channel.send({ embeds: [errorEmbed] }).catch(() => null);
        }
        return;
      }
    }

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
    } else if (customId.startsWith('suite_revoke_access_')) {
      const targetId = customId.replace('suite_revoke_access_', '');
      try {
        await interaction.deferUpdate().catch(() => null);
        await interaction.channel.permissionOverwrites.delete(targetId).catch(async () => {
          await interaction.channel.permissionOverwrites.create(targetId, { ViewChannel: false }).catch(() => null);
        });

        const targetRole = interaction.guild.roles.cache.get(targetId);
        const targetMember = interaction.guild.members.cache.get(targetId);
        const targetName = targetRole ? `<@&${targetRole.id}>` : (targetMember ? `<@${targetMember.id}>` : 'la cible');

        const successEmbed = new EmbedBuilder()
          .setTitle('🔒 Accès Retiré — Confidentialité Restaurée')
          .setDescription(`✅ L'accès de ${targetName} à ce salon a été retiré avec succès par <@${interaction.user.id}>. Le problème est classé comme résolu !`)
          .setColor('#2ECC71')
          .setTimestamp();

        await interaction.editReply({ embeds: [successEmbed], components: [] }).catch(console.error);
      } catch (err) {
        console.error('Erreur lors du retrait d\'accès:', err);
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
    } else if (customId.startsWith('suite_revoke_role_')) {
      const roleId = customId.replace('suite_revoke_role_', '');
      const { getPrivateSuiteByChannel, getActiveTicket } = require('./database/db');
      const suite = getPrivateSuiteByChannel(interaction.channelId);
      const ticket = getActiveTicket(interaction.channelId);

      const isStaff = interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
                      interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                      (suite && interaction.user.id === suite.user_id) ||
                      (ticket && interaction.user.id === ticket.user_id);

      if (!isStaff) {
        return interaction.reply({ content: '❌ Seul le propriétaire du salon ou un administrateur peut retirer l\'accès.', ephemeral: true });
      }

      try {
        await interaction.channel.permissionOverwrites.delete(roleId).catch(async () => {
          await interaction.channel.permissionOverwrites.create(roleId, { ViewChannel: false });
        });

        const embed = new EmbedBuilder()
          .setTitle('🔒 Accès Révoqué')
          .setDescription(`L'accès au salon pour le rôle <@&${roleId}> a été révoqué avec succès.\nLe problème a été marqué comme résolu.`)
          .setColor('#E74C3C')
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } catch (err) {
        console.error('Erreur révocation rôle:', err);
        return interaction.reply({ content: '❌ Impossible de retirer les permissions de ce rôle.', ephemeral: true });
      }
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
    } else if (customId.startsWith('conf_approve_')) {
      const pendingId = parseInt(customId.replace('conf_approve_', ''));
      const { handleConfessionApproval } = require('./utils/confessionHandler');
      return handleConfessionApproval(interaction, pendingId);
    } else if (customId.startsWith('conf_reject_')) {
      const pendingId = parseInt(customId.replace('conf_reject_', ''));
      const { handleConfessionRejection } = require('./utils/confessionHandler');
      return handleConfessionRejection(interaction, pendingId);
    } else if (customId.startsWith('boutique_cat:')) {
      const cat = customId.replace('boutique_cat:', '');
      const boutiqueCmd = client.commands.get('boutique');
      if (boutiqueCmd && boutiqueCmd.renderBoutiqueCatalog) {
        return boutiqueCmd.renderBoutiqueCatalog(interaction, cat, true);
      }
      return;
    } else if (customId.startsWith('inv_btn_use:')) {
      const itemName = customId.replace('inv_btn_use:', '');
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`inv_use_target:${itemName}`)
        .setPlaceholder(`Choisissez le membre avec qui utiliser ${itemName}...`);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.reply({ content: `🧪 **Avec quel membre souhaitez-vous utiliser "${itemName}" ?**`, components: [row], ephemeral: true });
    } else if (customId.startsWith('inv_btn_gift:')) {
      const itemName = customId.replace('inv_btn_gift:', '');
      const selectMenu = new UserSelectMenuBuilder()
        .setCustomId(`inv_gift_target:${itemName}`)
        .setPlaceholder(`Choisissez le membre à qui offrir ${itemName}...`);
      const row = new ActionRowBuilder().addComponents(selectMenu);
      return interaction.reply({ content: `🎁 **À quel membre souhaitez-vous offrir "${itemName}" ?**`, components: [row], ephemeral: true });
    } else if (customId.startsWith('inv_btn_drop:')) {
      const itemName = customId.replace('inv_btn_drop:', '');
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez pas cet objet.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      return interaction.reply({ content: `🗑️ Vous avez jeté 1x **${itemName}** de votre inventaire.`, ephemeral: true });
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'inv_select_item') {
      const itemName = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎒 Objet : ${item.item_name}`)
        .setDescription(`💎 **Quantité possédée :** \`x${item.quantity}\`\n\n👇 *Choisissez une action à effectuer ci-dessous :*`)
        .setColor('#9B59B6')
        .setFooter({ text: '🎒 Inventaire VIP • B&G Elite' })
        .setTimestamp();

      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`inv_btn_use:${item.item_name}`).setLabel('Utiliser avec un membre').setStyle(ButtonStyle.Primary).setEmoji('🧪'),
        new ButtonBuilder().setCustomId(`inv_btn_gift:${item.item_name}`).setLabel('Offrir à un membre').setStyle(ButtonStyle.Success).setEmoji('🎁'),
        new ButtonBuilder().setCustomId(`inv_btn_drop:${item.item_name}`).setLabel('Jeter 1x').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
      );

      return interaction.reply({ embeds: [embed], components: [actionRow], ephemeral: true });
    } else if (interaction.customId === 'boutique_acheter') {
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
    } else if (interaction.customId.startsWith('ticket_')) {
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

    if (customId.startsWith('ticket_')) {
      const { handleTicketInteraction } = require('./utils/ticketHandler');
      return handleTicketInteraction(interaction, client);
    }

    if (customId.startsWith('inv_use_target:')) {
      const itemName = customId.replace('inv_use_target:', '');
      const targetUserId = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      await interaction.deferReply({ ephemeral: true });

      const buyerMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      const { generateSensualText } = require('./utils/aiActionHelper');
      const instruction = `${buyerMember ? buyerMember.displayName : 'L\'auteur'} utilise l'objet sensuel "${itemName}" avec ${targetMember ? targetMember.displayName : 'la cible'}.`;
      const aiText = await generateSensualText(instruction, 250, guildId, targetMember);

      const useEmbed = new EmbedBuilder()
        .setTitle('🧪 💋 UTILISATION D\'UN OBJET DE SÉDUCTION ! 💋 🧪')
        .setDescription(
          `🔥 **Attention les yeux... Un moment de partage passionné a lieu !** 💋\n\n` +
          `✨ **<@${userId}>** utilise **${itemName}** avec **<@${targetUserId}>** ! 🥂👠\n\n` +
          `>>> *"${aiText || `${interaction.user.username} partage un moment d'une complicité intense et envoûtante avec ${targetMember ? targetMember.displayName : 'son partenaire'}.`}"*`
        )
        .setColor('#9B59B6')
        .setFooter({ text: '💋 Moment Sensuel & Expérience VIP • B&G Elite' })
        .setTimestamp();

      await interaction.channel.send({ content: `💋 **Hey <@${targetUserId}> ! <@${userId}> vient d'utiliser l'objet ${itemName} avec toi !** 🔥✨`, embeds: [useEmbed] }).catch(() => {});

      return interaction.editReply({ content: `✅ **Succès !** Vous avez utilisé 1x **${itemName}** avec <@${targetUserId}> !` });
    }

    if (customId.startsWith('inv_gift_target:')) {
      const itemName = customId.replace('inv_gift_target:', '');
      const targetUserId = interaction.values[0];
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const { db } = require('./database/db');

      if (targetUserId === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous offrir un cadeau à vous-même.', ephemeral: true });
      }

      const item = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, itemName);
      if (!item || item.quantity <= 0) {
        return interaction.reply({ content: '❌ Vous ne possédez plus cet objet dans votre inventaire.', ephemeral: true });
      }

      if (item.quantity > 1) {
        db.prepare('UPDATE inventory SET quantity = quantity - 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      } else {
        db.prepare('DELETE FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, userId, itemName);
      }

      const targetItem = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, targetUserId, itemName);
      if (targetItem) {
        db.prepare('UPDATE inventory SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, targetUserId, itemName);
      } else {
        db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, 1)').run(guildId, targetUserId, itemName);
      }

      await interaction.deferReply({ ephemeral: true });

      const buyerMember = await interaction.guild.members.fetch(userId).catch(() => null);
      const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);

      const { generateAiGiftPhrase } = require('./utils/aiActionHelper');
      const aiGiftText = await generateAiGiftPhrase(buyerMember, targetMember, itemName, guildId);

      const sexyQuotes = [
        "Un frisson de désir traverse le salon... L'amour et le fantasme n'attendent pas. 💋",
        "Un geste brûlant d'élégance et de séduction pur jus... 🥂🔥",
        "Une délicieuse surprise envoûtante transmise directement depuis le boudoir... 💄💋"
      ];
      const quote = aiGiftText || sexyQuotes[Math.floor(Math.random() * sexyQuotes.length)];

      const giftEmbed = new EmbedBuilder()
        .setTitle('🔥 🎁 💋 CADEAU TRANSMIS AVEC PASSION ! 💋 🎁 🔥')
        .setDescription(
          `🔥 **Attention les yeux... Un désir secret vient d'être offert !** 💋\n\n` +
          `✨ **<@${userId}>** fait fondre **<@${targetUserId}>** en lui transmettant **${itemName}** ! 👠🥂\n\n` +
          `>>> *"${quote}"*`
        )
        .setColor('#E74C3C')
        .setFooter({ text: '💋 Boudoir VIP & Transferts d\'Inventaire • B&G Elite' })
        .setTimestamp();

      await interaction.channel.send({ content: `💋 **Hey <@${targetUserId}> ! Reçois ce cadeau torride transmis depuis l'inventaire de <@${userId}> !** 🔥✨`, embeds: [giftEmbed] }).catch(() => {});

      return interaction.editReply({ content: `✅ **Succès !** Vous avez offert 1x **${itemName}** à <@${targetUserId}> !` });
    }

    if (customId.startsWith('boutique_gift_select:')) {
      const itemName = customId.replace('boutique_gift_select:', '');
      const targetUserId = interaction.values[0];
      const boutiqueCmd = client.commands.get('boutique');

      if (targetUserId === interaction.user.id) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous offrir un cadeau à vous-même via ce menu. Choisissez un autre membre ou achetez directement pour vous.', ephemeral: true });
      }

      if (boutiqueCmd && boutiqueCmd.processPurchase) {
        await boutiqueCmd.processPurchase(interaction, itemName, targetUserId);
      }
      return;
    }

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
    if (interaction.customId === 'reply_confession_modal') {
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
    }
  }

  if (!interaction.isChatInputCommand() && !interaction.isContextMenuCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`Aucune commande correspondant à ${interaction.commandName} n'a été trouvée.`);
    return;
  }

  const guildId = interaction.guildId;
  if (guildId) {
    const { getCommandPermission, getQuarantineConfig } = require('./database/db');

    // Bloquer TOUTES les commandes pour le rôle Quarantaine (si configuré)
    try {
      const qConfig = getQuarantineConfig(guildId);
      if (qConfig && qConfig.role_id) {
        const userRoleIds = interaction.member?.roles?.cache ? Array.from(interaction.member.roles.cache.keys()) : [];
        if (userRoleIds.includes(qConfig.role_id)) {
          return interaction.reply({
            content: '❌ Vous êtes actuellement en **quarantaine** et ne pouvez utiliser aucune commande sur ce serveur.',
            ephemeral: true
          });
        }
      }
    } catch (e) {
      console.error('Erreur lors du contrôle du rôle quarantaine:', e);
    }

    const member = interaction.member;
    const { PermissionsBitField } = require('discord.js');
    let userPerms = member?.permissions;
    if (!userPerms || typeof userPerms.has !== 'function') {
      userPerms = interaction.memberPermissions;
    }
    if (!userPerms || typeof userPerms.has !== 'function') {
      userPerms = new PermissionsBitField();
    }

    const customPerm = getCommandPermission(guildId, interaction.commandName);
    if (customPerm) {
      if (customPerm.enabled === 0) {
        return interaction.reply({ content: `❌ La commande \`/${interaction.commandName}\` a été désactivée par les administrateurs sur ce serveur.`, ephemeral: true });
      }

      const hasNativePerm = 
        userPerms.has(PermissionsBitField.Flags.Administrator) ||
        userPerms.has(PermissionsBitField.Flags.ManageGuild) ||
        (['ban', 'unban', 'massban'].includes(interaction.commandName) && userPerms.has(PermissionsBitField.Flags.BanMembers)) ||
        (['kick', 'masskick'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers))) ||
        (['clear'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.ModerateMembers))) ||
        (['warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(interaction.commandName) && (userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers)));

      if (!hasNativePerm) {
        let allowedRoles = [];
        let deniedRoles = [];
        try { allowedRoles = JSON.parse(customPerm.allowed_roles || '[]'); } catch (e) {}
        try { deniedRoles = JSON.parse(customPerm.denied_roles || '[]'); } catch (e) {}

        const userRoleIds = member?.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member?.roles) ? member.roles : []);

        if (deniedRoles.length > 0 && deniedRoles.some(rId => userRoleIds.includes(rId))) {
          return interaction.reply({ content: `❌ Votre rôle vous interdit d'utiliser la commande \`/${interaction.commandName}\`.`, ephemeral: true });
        }

        if (allowedRoles.length > 0 && !allowedRoles.some(rId => userRoleIds.includes(rId))) {
          return interaction.reply({ content: `❌ Vous n'avez pas le rôle requis pour utiliser la commande \`/${interaction.commandName}\`.`, ephemeral: true });
        }
      }
    }

    const { getPermissionsConfig } = require('./database/db');
    const permConfig = getPermissionsConfig(guildId);
    
    const adminRoleId = permConfig.admin_role_id;
    const modoRoleId = permConfig.modo_role_id;
    
    let subcommand = null;
    try {
      subcommand = interaction.options.getSubcommand(false);
    } catch (e) {}

    const isAllowedForEveryone = 
      (command.category === 'actions' || 
       (command.category === 'economy' && !['dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(interaction.commandName)) ||
       ['travailler', 'daily', 'work', 'crime', 'rob', 'voler', 'pecher', 'action-verite', 'niveau', 'solde', 'karma', 'mapville', 'proche', 'boutique', 'leaderboard', 'confess', 'confesser', 'deposit', 'deposer', 'withdraw', 'retirer', 'donner', 'pay', 'lovecalc', 'mot-cache', 'tribunal', 'uno', 'star', 'gifle', 'patpat', 'quetes'].includes(interaction.commandName)) &&
      !['dashboard'].includes(interaction.commandName);
      
    if (!isAllowedForEveryone) {
      const isUserAdmin = Boolean(userPerms.has(PermissionsBitField.Flags.Administrator));
      const userRoleIds = member?.roles?.cache ? Array.from(member.roles.cache.keys()) : (Array.isArray(member?.roles) ? member.roles : []);

      let dashRoles = [];
      let adminCmdsRoles = [];
      let modoCmdsRoles = [];
      try { dashRoles = typeof permConfig.dashboard_roles === 'string' ? JSON.parse(permConfig.dashboard_roles || '[]') : (permConfig.dashboard_roles || []); } catch (_) {}
      try { adminCmdsRoles = typeof permConfig.admin_cmds_roles === 'string' ? JSON.parse(permConfig.admin_cmds_roles || '[]') : (permConfig.admin_cmds_roles || []); } catch (_) {}
      try { modoCmdsRoles = typeof permConfig.modo_cmds_roles === 'string' ? JSON.parse(permConfig.modo_cmds_roles || '[]') : (permConfig.modo_cmds_roles || []); } catch (_) {}

      const hasDashDerogation = interaction.commandName === 'dashboard' && dashRoles.some(rId => userRoleIds.includes(rId));
      const hasAdminCmdsDerogation = adminCmdsRoles.some(rId => userRoleIds.includes(rId));
      
      const isModoCmd = ['ban', 'kick', 'unban', 'clear', 'warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'massban', 'masskick', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp', 'dashboard'].includes(interaction.commandName);
      const hasModoCmdsDerogation = isModoCmd && modoCmdsRoles.some(rId => userRoleIds.includes(rId));

      // Vérification des permissions Discord natives selon la commande
      let hasDiscordNativePerm = false;
      const cmdName = interaction.commandName;

      try {
        if (isUserAdmin) {
          hasDiscordNativePerm = true;
        } else if (['ban', 'unban', 'massban'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.BanMembers) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.ModerateMembers);
        } else if (['kick', 'masskick', 'dashboard'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers) || hasDashDerogation;
        } else if (['clear'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers);
        } else if (['warn', 'unwarn', 'mute', 'unmute', 'timeout', 'untimeout', 'quarantaine', 'dropargent', 'drop-argent', 'dropkarma', 'drop-karma', 'dropxp', 'drop-xp'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ModerateMembers) || userPerms.has(PermissionsBitField.Flags.ManageMessages) || userPerms.has(PermissionsBitField.Flags.KickMembers) || userPerms.has(PermissionsBitField.Flags.BanMembers);
        } else if (['ajouter', 'syncautoroles', 'addEmojiContext'].includes(cmdName)) {
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageGuild) || userPerms.has(PermissionsBitField.Flags.ManageRoles);
        } else {
          // Commandes Admin / Config
          hasDiscordNativePerm = userPerms.has(PermissionsBitField.Flags.ManageGuild) || userPerms.has(PermissionsBitField.Flags.Administrator);
        }

        // Si la commande définit par défaut des permissions requises dans son builder
        if (!hasDiscordNativePerm && command.data && command.data.default_member_permissions) {
          hasDiscordNativePerm = userPerms.has(BigInt(command.data.default_member_permissions));
        }
      } catch (permErr) {
        console.error('Erreur lors du calcul des permissions natives Discord:', permErr);
      }

      const hasAllowedRole = 
        isUserAdmin ||
        hasDiscordNativePerm ||
        (adminRoleId && userRoleIds.includes(adminRoleId)) || 
        (modoRoleId && userRoleIds.includes(modoRoleId)) ||
        hasDashDerogation ||
        hasAdminCmdsDerogation ||
        hasModoCmdsDerogation;
        
      if (!hasAllowedRole) {
        return interaction.reply({
          content: "❌ Vous n'avez pas les permissions Discord ou le rôle requis pour utiliser cette commande.",
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

    // Log de l'exécution de la commande dans la catégorie 'bots'
    if (interaction.guild) {
      try {
        const { sendLog } = require('./utils/helpers');
        let cmdDetails = `\`/${interaction.commandName}\``;
        if (subcommand) cmdDetails += ` \`${subcommand}\``;

        const logEmbed = new EmbedBuilder()
          .setTitle('🤖 Exécution de Commande Slash')
          .setDescription(
            `**Exécuteur :** ${interaction.user.tag} (<@${interaction.user.id}>) ${interaction.user.bot ? '[BOT]' : ''}\n` +
            `**Bot Cible / Application :** ${client.user.tag} (<@${client.user.id}>)\n` +
            `**Commande :** ${cmdDetails}\n` +
            `**Salon :** <#${interaction.channelId}>`
          )
          .setColor('#9B59B6')
          .setTimestamp();

        sendLog(interaction.guild, 'bots', logEmbed, { isBot: true });
      } catch (e) {
        console.error('Erreur log commande bots:', e);
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
    
    // Déploiement global unique des commandes (évite l'affichage en double)
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commandsJSON }
    );

    // Supprimer les résidus de commandes de guilde pour éviter les doublons sur Discord
    for (const [guildId, guild] of client.guilds.cache) {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: [] }
      ).catch(() => {});
    }

    console.log('Commandes d\'application (/) enregistrées sans doublon.');
    
    // Nettoyage et resynchronisation automatique des suites privées et salons tribunal
    setInterval(() => checkExpiredSuites(client), 60000);
    checkExpiredSuites(client);
    syncExistingChannels(client);

    // Nettoyage automatique des rôles temporaires toutes les 60 secondes
    setInterval(() => checkExpiredTemporaryRoles(client), 60000);
    checkExpiredTemporaryRoles(client);

    // Vérification des rappels de Bumps toutes les 30 secondes
    setInterval(() => checkBumpReminders(client), 30000);
    checkBumpReminders(client);

    // Vérification automatique des élections Star de la Semaine (toutes les 60s)
    const { checkStarElections } = require('./utils/starManager');
    setInterval(() => checkStarElections(client), 60000);
    checkStarElections(client);

    // Mettre en cache tous les membres de tous les serveurs au démarrage
    client.guilds.cache.forEach(guild => {
      guild.members.fetch()
        .then(() => console.log(`[Cache] Membres de ${guild.name} mis en cache.`))
        .catch(err => console.error(`[Cache] Impossible de mettre en cache les membres de ${guild.name}:`, err));
    });

    // Scan et réouverture des forums illimités au démarrage
    const { scanAndReopenAllUnlimitedForums } = require('./utils/forums');
    scanAndReopenAllUnlimitedForums(client).catch(console.error);

    client.syncExistingChannels = () => syncExistingChannels(client);
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement des commandes slash :', error);
  }
});

// API server pour exposer les guilds du bot
const express = require('express');
const apiApp = express();
const API_PORT = process.env.BOT_API_PORT || 49605;

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

    let message = null;
    let isSameChannelEdit = false;

    if (existingMessageId) {
      // 1. Chercher dans le salon cible
      message = await channel.messages.fetch(existingMessageId).catch(() => null);
      if (message) {
        if (message.author.id === client.user.id) {
          isSameChannelEdit = true;
        }
      } else {
        // 2. Si le salon cible est différent (copie dans un autre salon), chercher en parallèle dans tous les salons
        const textChannels = Array.from(guild.channels.cache.values()).filter(ch => ch.isTextBased() && ch.id !== channelId);
        const results = await Promise.all(textChannels.map(ch => ch.messages.fetch(existingMessageId).then(m => ({ msg: m, ch })).catch(() => null)));
        const found = results.find(r => r && r.msg);
        if (found) {
          message = found.msg;
        }
      }
    }

    const { StringSelectMenuBuilder } = require('discord.js');
    let row;
    
    if (type === 'buttons') {
      if (options && options.length > 0) {
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
      if (options && options.length > 0) {
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

    const embed = new EmbedBuilder()
      .setColor(color || '#5865F2')
      .setTimestamp();
    
    if (title && title.trim()) {
      embed.setTitle(title.trim());
    }
    if (description && description.trim()) {
      embed.setDescription(description.trim());
    }

    // Si titre et description ne sont pas fournis mais qu'on a un message existant, préserver l'embed ou le texte original !
    if (!title && !description) {
      if (existingMessageId && message) {
        if (message.embeds && message.embeds.length > 0) {
          const origEmb = message.embeds[0];
          if (origEmb.title) embed.setTitle(origEmb.title);
          if (origEmb.description) embed.setDescription(origEmb.description);
          if (origEmb.color) embed.setColor(origEmb.color);
        } else if (message.content) {
          embed.setDescription(message.content);
        }
      } else {
        embed.setDescription('Cliquez sur les options ci-dessous pour obtenir ou retirer des rôles.');
      }
    }
    
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
    } else if (existingMessageId && message) {
      if (message.embeds && message.embeds[0] && message.embeds[0].image && message.embeds[0].image.url) {
        embed.setImage(message.embeds[0].image.url);
      } else if (message.attachments && message.attachments.size > 0) {
        const firstAtt = message.attachments.first();
        if (firstAtt && firstAtt.url) {
          embed.setImage(firstAtt.url);
        }
      }
    }

    let finalMessageId = null;

    if (isSameChannelEdit && message) {
      // Édition directe du message existant du bot dans le même salon
      const editPayload = { embeds: [embed] };
      if (files.length > 0) editPayload.files = files;
      if (row) editPayload.components = [row];
      else editPayload.components = [];
      await message.edit(editPayload);
      finalMessageId = message.id;

      if (type === 'reactions' && options && options.length > 0) {
        for (const opt of options) {
          if (opt.emoji) {
            await message.react(opt.emoji).catch(console.error);
          }
        }
      }
    } else if (existingMessageId && message && message.author.id !== client.user.id && type === 'reactions') {
      // Message d'un membre/autre bot où l'on ajoute des réactions
      for (const opt of options) {
        if (opt.emoji) {
          await message.react(opt.emoji).catch(console.error);
        }
      }
      finalMessageId = message.id;
    } else {
      // Envoi d'un nouveau message embed ou copie dans un autre salon
      const payload = { embeds: [embed] };
      if (files.length > 0) payload.files = files;
      if (row) payload.components = [row];

      const newMessage = await channel.send(payload);
      finalMessageId = newMessage.id;

      if (type === 'reactions' && options && options.length > 0) {
        for (const opt of options) {
          if (opt.emoji) {
            await newMessage.react(opt.emoji).catch(console.error);
          }
        }
      }
    }

    return res.json({ success: true, messageId: finalMessageId });
  } catch (error) {
    console.error('Error sending/editing autorole:', error);
    res.status(500).json({ error: error.message });
  }
});

apiApp.post('/bot/send-sondage', async (req, res) => {
  try {
    const { guildId, channelId, resultsChannelId, title, description, ratingIcon = '⭐', textType = 'long', color = '#F1C40F', existingSondageId, sections = [], hasGeneralRemark = true, avatarImage = '', bannerImage = '', shortDescription = '', mentions = [], googleFormUrl = '' } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Serveur introuvable' });
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return res.status(404).json({ error: 'Salon introuvable' });

    const sondageId = existingSondageId || `sndg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const { createSondage, db } = require('./database/db');
    if (existingSondageId) {
      try {
        db.prepare(`UPDATE sondages SET channel_id = ?, results_channel_id = ?, title = ?, description = ?, rating_icon = ?, text_type = ?, color = ?, sections = ?, has_general_remark = ?, avatar_image = ?, banner_image = ?, short_description = ?, mentions = ?, google_form_url = ? WHERE id = ? AND guild_id = ?`).run(
          channelId, resultsChannelId || null, title, description, ratingIcon, textType, color,
          JSON.stringify(sections), hasGeneralRemark ? 1 : 0, avatarImage, bannerImage, shortDescription,
          JSON.stringify(mentions), googleFormUrl || '', existingSondageId, guildId
        );
      } catch (e) {
        console.error('Erreur update sondage db:', e);
      }
    } else {
      createSondage({
        id: sondageId,
        guild_id: guildId,
        channel_id: channelId,
        results_channel_id: resultsChannelId || null,
        title,
        description,
        rating_icon: ratingIcon,
        text_type: textType,
        color,
        created_by: 'Dashboard',
        sections,
        has_general_remark: hasGeneralRemark ? 1 : 0,
        avatar_image: avatarImage,
        banner_image: bannerImage,
        short_description: shortDescription,
        mentions,
        google_form_url: googleFormUrl || ''
      });
    }

    let sectionsListStr = '';
    if (Array.isArray(sections) && sections.length > 0) {
      sectionsListStr = '\n\n**Sections d\'évaluation :**\n' + sections.map(s => `• ${s.label}`).join('\n');
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 ${title}`)
      .setDescription(
        (description ? `${description}\n` : '') +
        sectionsListStr +
        `\n\n*Cliquez sur le bouton ci-dessous pour remplir l'évaluation !*`
      )
      .addFields({
        name: '📈 Statistiques en temps réel',
        value: 'Aucune évaluation enregistrée pour le moment.'
      })
      .setColor(color)
      .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
      .setTimestamp();

    const hostIp = process.env.PUBLIC_IP || '82.65.75.176';
    const dashPort = process.env.DASHBOARD2_PORT || 49602;
    const formUrl = (googleFormUrl && googleFormUrl.trim()) ? googleFormUrl.trim() : `http://${hostIp}:${dashPort}/form.html?id=${sondageId}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('📋 Remplir le Formulaire')
        .setStyle(ButtonStyle.Link)
        .setURL(formUrl),
      new ButtonBuilder()
        .setCustomId(`sondage_vote:${sondageId}`)
        .setLabel('⚡ Vote Rapide Discord')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📝')
    );

    let sentMessage = null;
    if (existingSondageId) {
      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (messages) {
        sentMessage = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(existingSondageId));
        if (sentMessage && sentMessage.editable) {
          await sentMessage.edit({ embeds: [embed], components: [row] }).catch(() => null);
        }
      }
    }

    if (!sentMessage) {
      sentMessage = await channel.send({ embeds: [embed], components: [row] });
    }

    return res.json({ success: true, sondageId, messageId: sentMessage ? sentMessage.id : null });
  } catch (err) {
    console.error('Erreur API send-sondage:', err);
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/bot/submit-web-form', async (req, res) => {
  try {
    const { sondageId, userTag, sectionScores = [], generalRemark = '' } = req.body;
    const { getSondage, saveSondageResponse, getSondageResponses } = require('./database/db');
    const { getStarRatingStr } = require('./utils/sondageHandler');

    const sondage = getSondage(sondageId);
    if (!sondage) return res.status(404).json({ error: 'Sondage introuvable en base de données' });

    let totalScore = 0;
    let validScoresCount = 0;

    sectionScores.forEach(sec => {
      let score = parseInt(sec.rating) || 5;
      if (score < 1) score = 1;
      if (score > 5) score = 5;
      totalScore += score;
      validScoresCount++;
    });

    const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

    const responsePayload = {
      overallRating,
      sectionScores,
      generalRemark: (generalRemark || '').trim()
    };

    const userId = `web_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    saveSondageResponse(sondageId, userId, Math.round(overallRating), JSON.stringify(responsePayload));

    const guild = client.guilds.cache.get(sondage.guild_id);
    if (guild) {
      const channel = guild.channels.cache.get(sondage.channel_id);
      if (channel && channel.isTextBased()) {
        const responses = getSondageResponses(sondageId);
        const totalVotes = responses.length;

        let globalAvg = 0;
        if (totalVotes > 0) {
          const sum = responses.reduce((acc, r) => acc + (r.rating || 5), 0);
          globalAvg = (sum / totalVotes).toFixed(1);
        }

        const icon = sondage.rating_icon || '⭐';

        const embed = new EmbedBuilder()
          .setTitle(`📊 ${sondage.title}`)
          .setDescription(
            (sondage.description ? `${sondage.description}\n\n` : '') +
            `**📈 Statistiques d'Évaluation en Temps Réel :**\n` +
            `• **Note globale moyenne :** ${globalAvg}/5 ${icon}\n` +
            `• **Nombre de fiches d'évaluations :** ${totalVotes} membre(s)`
          )
          .setColor(sondage.color || '#F1C40F')
          .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
          .setTimestamp();

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
          const origMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(sondageId));
          if (origMsg && origMsg.editable) {
            await origMsg.edit({ embeds: [embed] }).catch(() => null);
          }
        }
      }

      if (sondage.results_channel_id) {
        const resultsChannel = guild.channels.cache.get(sondage.results_channel_id);
        if (resultsChannel && resultsChannel.isTextBased()) {
          let mentionsArr = [];
          try {
            mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
          } catch (e) {}

          const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

          const items = [];
          sectionScores.forEach(sec => {
            let scoreText = getStarRatingStr(sec.rating, sondage.rating_icon || '⭐');
            let val = sec.observation ? `${scoreText}\n*Remarques :* "${sec.observation}"` : scoreText;
            items.push({ name: sec.label, value: val });
          });

          if (generalRemark && generalRemark.trim()) {
            items.push({ name: '📌 Remarques & Suggestions Générales', value: `"${generalRemark.trim()}"` });
          }

          const embedContent = items.map(item => `**${item.name}**\n${item.value}`).join('\n\n');
          const shortDesc = sondage.short_description && sondage.short_description.trim() ? sondage.short_description.trim() : 'Voici les réponses reçues :';

          const ficheEmbed = new EmbedBuilder()
            .setTitle(sondage.title || 'Nouvelle réponse au formulaire')
            .setDescription(`${shortDesc}\n\n${embedContent}`)
            .setColor(sondage.color || '#78A8C6')
            .setTimestamp();

          if (sondage.avatar_image && sondage.avatar_image.trim()) {
            ficheEmbed.setThumbnail(sondage.avatar_image.trim());
          }

          if (sondage.banner_image && sondage.banner_image.trim()) {
            ficheEmbed.setImage(sondage.banner_image.trim());
          }

          const authorText = userTag ? `Réponse soumise via Web par ${userTag}` : `Réponse soumise via le Formulaire Web`;
          ficheEmbed.setFooter({ text: authorText });

          await resultsChannel.send({
            content: mentionsContent,
            embeds: [ficheEmbed]
          }).catch(console.error);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Erreur submit-web-form:', err);
    res.status(500).json({ error: err.message });
  }
});

apiApp.post('/bot/submit-google-form', async (req, res) => {
  try {
    const { sondageId, userEmail, answers = [] } = req.body;
    const { getSondage, saveSondageResponse, getSondageResponses } = require('./database/db');

    const sondage = getSondage(sondageId);
    if (!sondage) return res.status(404).json({ error: 'Sondage introuvable en base de données' });

    let totalScore = 0;
    let validScoresCount = 0;

    const items = [];
    const sectionScores = [];

    answers.forEach(item => {
      const qTitle = item.question || 'Question';
      const ansVal = item.answer || '';
      const rawAns = Array.isArray(ansVal) ? ansVal.join(', ') : String(ansVal);

      let score = 5;
      const icon = sondage.rating_icon || '⭐';
      const escapedIcon = icon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const starMatches = (rawAns.match(new RegExp(escapedIcon, 'g')) || []).length;
      
      if (starMatches > 0 && starMatches <= 5) {
        score = starMatches;
      } else {
        const digitMatch = rawAns.match(/\b([1-5])\b/);
        if (digitMatch) score = parseInt(digitMatch[1]);
      }

      totalScore += score;
      validScoresCount++;

      items.push({ name: qTitle, value: rawAns ? `*Réponse :* "${rawAns}"` : '*Pas de réponse*' });
      sectionScores.push({ label: qTitle, rating: score, observation: rawAns });
    });

    const overallRating = validScoresCount > 0 ? (totalScore / validScoresCount).toFixed(1) : '5.0';

    const responsePayload = {
      overallRating,
      sectionScores,
      googleFormEmail: userEmail || ''
    };

    const userId = `gform_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    saveSondageResponse(sondageId, userId, Math.round(overallRating), JSON.stringify(responsePayload));

    const guild = client.guilds.cache.get(sondage.guild_id);
    if (guild) {
      const channel = guild.channels.cache.get(sondage.channel_id);
      if (channel && channel.isTextBased()) {
        const responses = getSondageResponses(sondageId);
        const totalVotes = responses.length;

        let globalAvg = 0;
        if (totalVotes > 0) {
          const sum = responses.reduce((acc, r) => acc + (r.rating || 5), 0);
          globalAvg = (sum / totalVotes).toFixed(1);
        }

        const icon = sondage.rating_icon || '⭐';

        const embed = new EmbedBuilder()
          .setTitle(`📊 ${sondage.title}`)
          .setDescription(
            (sondage.description ? `${sondage.description}\n\n` : '') +
            `**📈 Statistiques Google Forms en Temps Réel :**\n` +
            `• **Note globale moyenne :** ${globalAvg}/5 ${icon}\n` +
            `• **Nombre de fiches d'évaluations :** ${totalVotes} réponse(s)`
          )
          .setColor(sondage.color || '#F1C40F')
          .setFooter({ text: `ID Sondage : ${sondageId} • Bagbot Elite` })
          .setTimestamp();

        const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
        if (messages) {
          const origMsg = messages.find(m => m.embeds.length > 0 && m.embeds[0].footer && m.embeds[0].footer.text && m.embeds[0].footer.text.includes(sondageId));
          if (origMsg && origMsg.editable) {
            await origMsg.edit({ embeds: [embed] }).catch(() => null);
          }
        }
      }

      if (sondage.results_channel_id) {
        const resultsChannel = guild.channels.cache.get(sondage.results_channel_id);
        if (resultsChannel && resultsChannel.isTextBased()) {
          let mentionsArr = [];
          try {
            mentionsArr = typeof sondage.mentions === 'string' ? JSON.parse(sondage.mentions || '[]') : (sondage.mentions || []);
          } catch (e) {}

          const mentionsContent = Array.isArray(mentionsArr) && mentionsArr.length > 0 ? mentionsArr.join(' ') : null;

          const embedContent = items.map(item => `**${item.name}**\n${item.value}`).join('\n\n');
          const shortDesc = sondage.short_description && sondage.short_description.trim() ? sondage.short_description.trim() : 'Voici la réponse reçue depuis Google Forms :';

          const ficheEmbed = new EmbedBuilder()
            .setTitle(sondage.title || 'Nouvelle réponse Google Forms')
            .setDescription(`${shortDesc}\n\n${embedContent}`)
            .setColor(sondage.color || '#78A8C6')
            .setTimestamp();

          if (sondage.avatar_image && sondage.avatar_image.trim()) {
            ficheEmbed.setThumbnail(sondage.avatar_image.trim());
          }

          if (sondage.banner_image && sondage.banner_image.trim()) {
            ficheEmbed.setImage(sondage.banner_image.trim());
          }

          const authorText = userEmail ? `Réponse Google Forms soumise par ${userEmail}` : `Réponse soumise via Google Forms`;
          ficheEmbed.setFooter({ text: authorText });

          await resultsChannel.send({
            content: mentionsContent,
            embeds: [ficheEmbed]
          }).catch(console.error);
        }
      }
    }

    res.json({ success: true, message: 'Google Forms webhook processed successfully' });
  } catch (err) {
    console.error('Erreur submit-google-form:', err);
    res.status(500).json({ error: err.message });
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

apiApp.post('/bot/age-verification-completed', async (req, res) => {
  try {
    const { guildId, userId, channelId, method, estimatedAge, roleIdToAssign, logChannelId } = req.body;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    
    const ticketChannel = guild.channels.cache.get(channelId);
    const logChannel = logChannelId ? (guild.channels.cache.get(logChannelId) || await guild.channels.fetch(logChannelId).catch(() => null)) : null;

    const targetChannel = logChannel || ticketChannel;
    if (!targetChannel) return res.status(404).json({ error: 'Target channel not found' });

    const methodLabel = method === 'facial' ? '📸 Reconnaissance Faciale' : '📄 Carte d\'Identité / Document';
    const embed = new EmbedBuilder()
      .setTitle('🛡️ VÉRIFICATION D\'ÂGE VALIDÉE')
      .setDescription(
        `La majorité de <@${userId}> a été vérifiée avec succès !\n\n` +
        `• **Membre** : <@${userId}>\n` +
        `• **Statut** : ✅ **Majeur (Âge validé : ${estimatedAge} ans)**\n` +
        `• **Méthode utilisée** : ${methodLabel}\n` +
        `• **Salon Ticket** : <#${channelId}>\n` +
        `• **Horodatage** : <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor('#2ECC71')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/7542/7542245.png')
      .setFooter({ text: 'Bagbot Elite • Sécurité & Majorité' })
      .setTimestamp();

    await targetChannel.send({ content: `✅ Vérification d'âge validée pour <@${userId}> !`, embeds: [embed] }).catch(console.error);

    if (logChannel && ticketChannel && logChannel.id !== ticketChannel.id) {
      await ticketChannel.send({ content: `✅ <@${userId}>, votre vérification d'âge a été validée avec succès !` }).catch(console.error);
    }

    if (roleIdToAssign) {
      const member = await guild.members.fetch(userId).catch(() => null);
      if (member) {
        await member.roles.add(roleIdToAssign).catch(err => console.error('Erreur ajout rôle âge:', err));
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur age-verification-completed:', error);
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
      const guild = client.guilds.cache.get(suite.guild_id) || await client.guilds.fetch(suite.guild_id).catch(() => null);
      if (!guild) continue;

      let txtChan = suite.text_channel_id ? (guild.channels.cache.get(suite.text_channel_id) || await guild.channels.fetch(suite.text_channel_id).catch(() => null)) : null;
      let vcChan = suite.voice_channel_id ? (guild.channels.cache.get(suite.voice_channel_id) || await guild.channels.fetch(suite.voice_channel_id).catch(() => null)) : null;

      if (suite.expires_at <= now) {
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

        deletePrivateSuite(suite.guild_id, suite.user_id);
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage suites privées:', err);
  }
}

async function syncExistingChannels(client) {
  try {
    const { getAllPrivateSuites, getShopConfig, db } = require('./database/db');
    const { getAllTribunalCases, getTribunalConfig } = require('./utils/tribunal_db');
    const { sendOrUpdateTicketPanel } = require('./utils/tickets');

    // 1. Resynchronisation des Suites Privées actives en base de données (ex: Jormungand)
    const suites = getAllPrivateSuites();
    const processedChannelIds = new Set();

    for (const suite of suites) {
      const guild = client.guilds.cache.get(suite.guild_id) || await client.guilds.fetch(suite.guild_id).catch(() => null);
      if (!guild) continue;

      const shopCfg = getShopConfig(suite.guild_id);
      const prefix = shopCfg.suiteChannelPrefix || '👑・suite-privée-';
      
      const member = await guild.members.fetch(suite.user_id).catch(() => null);
      const rawName = member ? (member.user.username || member.displayName) : suite.user_id;
      const cleanName = rawName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'suite';

      // Salon Textuel
      if (suite.text_channel_id) {
        processedChannelIds.add(suite.text_channel_id);
        const txtChan = guild.channels.cache.get(suite.text_channel_id) || await guild.channels.fetch(suite.text_channel_id).catch(() => null);
        if (txtChan) {
          const targetName = `${prefix}${cleanName}`.slice(0, 90);
          if (txtChan.name !== targetName) {
            await txtChan.setName(targetName).catch(err => console.error(`Erreur renommer text channel ${txtChan.id}:`, err.message));
          }
        }
      }

      // Salon Vocal (si présent)
      if (suite.voice_channel_id) {
        processedChannelIds.add(suite.voice_channel_id);
        const vcChan = guild.channels.cache.get(suite.voice_channel_id) || await guild.channels.fetch(suite.voice_channel_id).catch(() => null);
        if (vcChan) {
          const targetVcName = `👑 🔊 │ Suite de ${rawName.slice(0, 30)}`;
          if (vcChan.name !== targetVcName) {
            await vcChan.setName(targetVcName).catch(err => console.error(`Erreur renommer voice channel ${vcChan.id}:`, err.message));
          }
        }
      }
    }

    // 2. Restauration des anciens salons normaux (Secret Nest, Maxou, Miss/Mister) s'ils ont été renommés par erreur
    for (const [guildId, guild] of client.guilds.cache) {
      const channels = await guild.channels.fetch().catch(() => null);
      if (!channels) continue;

      for (const [chanId, chan] of channels.entries()) {
        if (!chan || !chan.name) continue;
        const nameLower = chan.name.toLowerCase();

        if (nameLower.includes('secret-nest') && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-the-secret-nest').catch(() => {});
        } else if (nameLower.includes('maxou') && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-de-maxou').catch(() => {});
        } else if ((nameLower.includes('miss') || nameLower.includes('mister')) && (chan.name.startsWith('👑') || chan.name.startsWith('🛋️'))) {
          await chan.setName('suite-miss-et-mister').catch(() => {});
        }
      }
    }

    // 3. Mettre à jour les panels d'embeds principaux (Tickets / Support) sans les renvoyer à neuf
    try {
      const panels = db.prepare('SELECT id FROM ticket_panels').all();
      for (const p of panels) {
        await sendOrUpdateTicketPanel(p.id, client, false).catch(() => {});
      }
    } catch (e) {}

    // 4. Resynchronisation des Procès du Tribunal existants
    const cases = getAllTribunalCases();
    for (const c of cases) {
      if (c.status === 'closed' || !c.channelId) continue;

      const guild = client.guilds.cache.get(c.guildId) || await client.guilds.fetch(c.guildId).catch(() => null);
      if (!guild) continue;

      const tribCfg = getTribunalConfig(c.guildId);
      const prefix = (tribCfg && tribCfg.channelPrefix) ? tribCfg.channelPrefix : '⚖️・procès-';

      const ch = guild.channels.cache.get(c.channelId) || await guild.channels.fetch(c.channelId).catch(() => null);
      if (ch) {
        const accusedMember = await guild.members.fetch(c.accusedId).catch(() => null);
        const accusedName = accusedMember?.displayName || accusedMember?.user?.username || 'accuse';
        const cleanName = accusedName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const targetName = `${prefix}${cleanName}`.slice(0, 90);

        if (ch.name !== targetName) {
          await ch.setName(targetName).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error('Erreur resynchronisation des salons:', err);
  }
}

async function checkExpiredTemporaryRoles(client) {
  try {
    const now = Date.now();
    const { getTemporaryRoles, deleteTemporaryRole } = require('./database/db');
    const tempRoles = getTemporaryRoles();

    for (const entry of tempRoles) {
      if (entry.expires_at <= now) {
        const guild = client.guilds.cache.get(entry.guild_id);
        if (guild) {
          const member = await guild.members.fetch(entry.user_id).catch(() => null);
          if (member) {
            const role = guild.roles.cache.get(entry.role_id);
            if (role) {
              await member.roles.remove(role).catch(console.error);
              await member.send(`⏳ Votre rôle temporaire **${role.name}** sur le serveur **${guild.name}** a expiré et vous a été retiré.`).catch(() => {});
            }
          }
        }
        deleteTemporaryRole(entry.guild_id, entry.user_id, entry.role_id);
      }
    }
  } catch (err) {
    console.error('Erreur nettoyage rôles temporaires:', err);
  }
}

async function checkBumpReminders(client) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const { getBumpConfig, db } = require('./database/db');
    const expiredReminders = db.prepare('SELECT * FROM bump_reminders WHERE next_bump_at <= ?').all(now);

    for (const reminder of expiredReminders) {
      try {
        const guild = client.guilds.cache.get(reminder.guild_id);
        if (guild) {
          const bumpConfig = getBumpConfig(reminder.guild_id);
          const channelId = bumpConfig.reminder_channel || reminder.channel_id;
          const channel = guild.channels.cache.get(channelId);

          if (channel) {
            const roleMention = bumpConfig.reminder_role ? `<@&${bumpConfig.reminder_role}>` : '';
            const { generateAiBumpPhrase } = require('./utils/aiActionHelper');
            const aiMessage = await generateAiBumpPhrase(reminder.bot_name, reminder.guild_id);
            const desc = aiMessage || `✨ Il est temps de bump le serveur avec le bot **${reminder.bot_name.toUpperCase()}** !`;

            const embed = new EmbedBuilder()
              .setTitle('🔔 Rappel de Bump !')
              .setDescription(desc)
              .setColor('#5865F2')
              .setTimestamp();

            await channel.send({
              content: roleMention || undefined,
              embeds: [embed]
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error(`Erreur d'envoi du rappel de bump pour le serveur ${reminder.guild_id}:`, err);
      } finally {
        db.prepare('DELETE FROM bump_reminders WHERE guild_id = ? AND bot_name = ?').run(reminder.guild_id, reminder.bot_name);
      }
    }
  } catch (err) {
    console.error('Erreur vérification rappels bumps:', err);
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

// Nettoyage automatique des salons de tribunal fermés expirés
setInterval(() => {
  if (client && client.isReady()) {
    const tribunalCmd = client.commands.get('tribunal');
    if (tribunalCmd && typeof tribunalCmd.checkExpiredTribunalCases === 'function') {
      tribunalCmd.checkExpiredTribunalCases(client).catch(() => null);
    }
  }
}, 60000);

module.exports = { client };

// Lancement du Dashboard Premium
require('./dashboard');
