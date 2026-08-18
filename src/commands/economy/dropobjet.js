const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require("discord.js");
const { db, getEconomy, updateEconomy, ensureDefaultShopItems, getShopConfig, getPrivateSuite, updatePrivateSuiteExpiry, addPrivateSuite } = require("../../database/db");

module.exports = {
  name: "dropobjet",

  data: new SlashCommandBuilder()
    .setName("dropobjet")
    .setDescription("Créer un drop d'un objet de la boutique pour le premier membre qui réagit (Admin uniquement)")
    .addStringOption(option =>
      option.setName("objet")
        .setDescription("L'objet de la boutique à faire gagner (autocomplétion disponible)")
        .setRequired(true)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalisé pour le largage (optionnel)")
        .setRequired(false))
    .setDMPermission(false),

  description: "Drop d'un objet de la boutique pour le premier qui réagit (Admin uniquement)",

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const guildId = interaction.guild ? interaction.guild.id : null;
    if (!guildId) return interaction.respond([]);

    try {
      ensureDefaultShopItems(guildId);
      const items = db.prepare('SELECT item_name, price FROM shop WHERE guild_id = ?').all(guildId);
      const filtered = items
        .filter(i => i.item_name.toLowerCase().includes(focusedValue))
        .slice(0, 25);

      await interaction.respond(
        filtered.map(i => ({ name: `${i.item_name} (${i.price}🪙)`, value: i.item_name }))
      );
    } catch (e) {
      await interaction.respond([]).catch(() => {});
    }
  },

  async execute(interaction) {
    const perms = interaction.memberPermissions || interaction.member?.permissions;
    const hasDiscordNativePerm = Boolean(
      perms?.has(PermissionsBitField.Flags.Administrator) ||
      perms?.has(PermissionsBitField.Flags.ModerateMembers) ||
      perms?.has(PermissionsBitField.Flags.ManageMessages) ||
      perms?.has(PermissionsBitField.Flags.KickMembers) ||
      perms?.has(PermissionsBitField.Flags.BanMembers)
    );

    if (!hasDiscordNativePerm) {
      return interaction.reply({ 
        content: "❌ Vous devez posséder une permission de modération Discord native pour créer un drop d'objet.", 
        ephemeral: true 
      });
    }

    const guildId = interaction.guild.id;
    const itemNameInput = interaction.options.getString("objet", true).trim();
    let customMessage = interaction.options.getString("message", false);

    ensureDefaultShopItems(guildId);
    
    // Rechercher l'article dans la boutique
    let item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND LOWER(item_name) = LOWER(?)').get(guildId, itemNameInput);
    if (!item) {
      item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND item_name LIKE ?').get(guildId, `%${itemNameInput}%`);
    }

    if (!item) {
      return interaction.reply({
        content: `❌ Aucun article trouvé sous le nom **"${itemNameInput}"** dans la boutique de ce serveur.`,
        ephemeral: true
      });
    }

    if (!customMessage) {
      const { generateAiDropPhrase } = require("../../utils/aiActionHelper");
      const aiDropText = await generateAiDropPhrase('dropobjet', 1, interaction.member, guildId, `Objet: ${item.item_name}`);
      customMessage = aiDropText || `🎁 **ALERTE LARGAGE D'OBJET RARE !** <@${interaction.user.id}> dépose l'article exclusif **${item.item_name}** ! Le premier à cliquer sur le bouton emporte l'objet ! ⚡`;
    }

    let itemDetails = `📦 **Objet :** \`${item.item_name}\`\n💎 **Valeur Boutique :** \`${item.price} pièces\``;
    if (item.description) itemDetails += `\n📝 *${item.description}*`;
    if (item.role_id) itemDetails += `\n✨ **Rôle inclus :** <@&${item.role_id}>`;
    if (item.reward_xp > 0 || item.reward_karma > 0) {
      itemDetails += `\n⚡ **Bonus :** ${item.reward_xp > 0 ? `+${item.reward_xp} XP ` : ''}${item.reward_karma > 0 ? `+${item.reward_karma} Karma` : ''}`;
    }

    const embed = new EmbedBuilder()
      .setFooter({ text: `${interaction.guild.name} • Soyez le plus rapide !` })
      .setTitle("🎁 Largage d'Objet Rare")
      .setDescription(customMessage)
      .setColor("#9B59B6")
      .addFields(
        { name: "🎁 Article en jeu", value: itemDetails, inline: false },
        { name: "⚠️ Statut", value: "Disponible", inline: true }
      )
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("claim_item_drop")
      .setLabel("🎁 Réclamer l'objet")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder().addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ time: 60000 });
    let claimed = false;

    collector.on("collect", async (btnInteraction) => {
      if (claimed) {
        return btnInteraction.reply({ content: "❌ Trop tard... Quelqu'un d'autre a été plus rapide.", ephemeral: true });
      }

      if (btnInteraction.user.id === interaction.user.id) {
        return btnInteraction.reply({ content: "❌ Vous ne pouvez pas réclamer votre propre cadeau.", ephemeral: true });
      }

      claimed = true;
      const winner = btnInteraction.user;
      const winnerMember = btnInteraction.member;

      // 1. Ajouter l'objet dans la table inventory du gagnant
      try {
        db.prepare(`
          INSERT INTO inventory (guild_id, user_id, item_name, quantity)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(guild_id, user_id, item_name) DO UPDATE SET quantity = quantity + 1
        `).run(guildId, winner.id, item.item_name);
      } catch (e) {
        console.error('[DropObjet] Erreur mise à jour inventaire:', e);
      }

      // 2. Traiter le rôle attribué si existant
      let roleGivenMsg = "";
      if (item.role_id && winnerMember) {
        try {
          await winnerMember.roles.add(item.role_id).catch(() => null);
          roleGivenMsg = `\n✨ Le rôle <@&${item.role_id}> vous a été attribué !`;
        } catch (e) {}
      }

      // 3. Traiter le bonus XP/Karma
      if (item.reward_xp > 0 || item.reward_karma > 0) {
        const eco = getEconomy(guildId, winner.id);
        updateEconomy(guildId, winner.id, {
          xp: (eco.xp || 0) + (item.reward_xp || 0),
          karma: (eco.karma || 0) + (item.reward_karma || 0)
        });
      }

      // 4. Si c'est une Suite Privée -> déclencher la création/extension de la Suite
      const isSuite = item.item_name.toLowerCase().startsWith('suite privée');
      let suiteMsg = "";
      if (isSuite) {
        let durationMs = 24 * 60 * 60 * 1000;
        let durationLabel = '1 jour';
        if (/7\s*jour/i.test(item.item_name)) {
          durationMs = 7 * 24 * 60 * 60 * 1000;
          durationLabel = '7 jours';
        } else if (/1\s*mois/i.test(item.item_name)) {
          durationMs = 30 * 24 * 60 * 60 * 1000;
          durationLabel = '1 mois';
        }

        const existingSuite = getPrivateSuite(guildId, winner.id);
        if (existingSuite) {
          const txtChan = interaction.guild.channels.cache.get(existingSuite.text_channel_id);
          if (txtChan) {
            const newExpiry = Math.max(Date.now(), existingSuite.expires_at) + durationMs;
            updatePrivateSuiteExpiry(guildId, winner.id, newExpiry);
            await txtChan.send(`🎉 **<@${winner.id}> a remporté un drop de prolongation de Suite Privée de ${durationLabel} !**\nNouvelle date d'expiration : <t:${Math.floor(newExpiry / 1000)}:F>.`).catch(() => null);
            suiteMsg = `\n👑 Votre Suite Privée a été prolongée de **${durationLabel}** !`;
          }
        } else {
          const shopCfg = getShopConfig(guildId);
          let category = null;
          if (shopCfg && shopCfg.privateSuiteCategoryId) {
            category = interaction.guild.channels.cache.get(shopCfg.privateSuiteCategoryId) || await interaction.guild.channels.fetch(shopCfg.privateSuiteCategoryId).catch(() => null);
          }
          if (!category) {
            category = interaction.guild.channels.cache.find(c => /suites/i.test(c.name || '') && c.type === ChannelType.GuildCategory);
            if (!category) {
              category = await interaction.guild.channels.create({
                name: '👑 🛋️ │ SUITES PRIVÉES VIP',
                type: ChannelType.GuildCategory,
                permissionOverwrites: [{ id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
              }).catch(() => null);
            }
          }

          const prefix = (shopCfg && shopCfg.suiteChannelPrefix) ? shopCfg.suiteChannelPrefix : '👑┆suite-';
          const cleanUsername = (winner.username || 'vip').toLowerCase().replace(/[^a-z0-9]/g, '');
          const chanName = `${prefix}${cleanUsername}`.slice(0, 90);

          try {
            const textChannel = await interaction.guild.channels.create({
              name: chanName,
              type: ChannelType.GuildText,
              parent: category ? category.id : null,
              permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: winner.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
                { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ReadMessageHistory] }
              ]
            });

            const expiresAt = Date.now() + durationMs;
            addPrivateSuite(guildId, winner.id, textChannel.id, null, expiresAt);

            const welcomeEmbed = new EmbedBuilder()
              .setTitle('👑 🛋️ ✨ BIENVENUE DANS VOTRE SUITE PRIVÉE VIP ✨ 🛋️ 👑')
              .setDescription(
                `🔥 **Félicitations <@${winner.id}> !** Vous avez remporté cette Suite Privée d'Exception lors d'un drop !\n\n` +
                `⏳ **Durée de réservation :** Expire le <t:${Math.floor(expiresAt / 1000)}:F> (<t:${Math.floor(expiresAt / 1000)}:R>).\n`
              )
              .setColor('#F1C40F')
              .setTimestamp();

            await textChannel.send({ embeds: [welcomeEmbed] }).catch(() => null);
            suiteMsg = `\n👑 Votre nouvelle Suite Privée VIP a été créée : <#${textChannel.id}> !`;
          } catch (e) {
            console.error('[DropObjet] Erreur création suite privée:', e);
          }
        }
      }

      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor("#2ECC71")
        .setFields(
          { name: "🎁 Article en jeu", value: itemDetails, inline: false },
          { name: "⚠️ Statut", value: `🏆 Réclamé par **${winner.tag}** (<@${winner.id}>)`, inline: false }
        );

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel(`Réclamé par ${winner.username}`)
        .setStyle(ButtonStyle.Secondary);

      await message.edit({ embeds: [updatedEmbed], components: [new ActionRowBuilder().addComponents(disabledButton)] });
      await btnInteraction.reply({ content: `🎉 **BRAVO !** Vous avez réclamé l'objet **${item.item_name}** ! Il a été ajouté à votre inventaire (\`/inventaire\`)${roleGivenMsg}${suiteMsg}.`, ephemeral: true });
    });

    collector.on("end", async (collected, reason) => {
      if (!claimed) {
        const expiredEmbed = EmbedBuilder.from(embed)
          .setColor("#95A5A6")
          .setFields(
            { name: "🎁 Article en jeu", value: itemDetails, inline: false },
            { name: "⚠️ Statut", value: "❌ Expiré - Personne n'a réclamé l'objet à temps.", inline: false }
          );

        const disabledButton = ButtonBuilder.from(button)
          .setDisabled(true)
          .setLabel("Expiré")
          .setStyle(ButtonStyle.Secondary);

        await message.edit({ embeds: [expiredEmbed], components: [new ActionRowBuilder().addComponents(disabledButton)] }).catch(() => {});
      }
    });
  }
};
