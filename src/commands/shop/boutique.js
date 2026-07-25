const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, StringSelectMenuBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, getEconomy, updateEconomy, getPrivateSuite, updatePrivateSuiteExpiry, addPrivateSuite, getKarmaConfig, getShopConfig, addTemporaryRole } = require('../../database/db');

function formatDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} minute(s)`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} heure(s)`;
  const days = Math.round(hours / 24);
  return `${days} jour(s)`;
}

function getKarmaDiscount(guildId, userId) {
  const economy = getEconomy(guildId, userId);
  const config = getKarmaConfig(guildId);
  if (!config.is_active) return 0;
  
  if (economy.karma >= config.threshold_3) {
    return config.discount_3 / 100;
  } else if (economy.karma >= config.threshold_2) {
    return config.discount_2 / 100;
  } else if (economy.karma >= config.threshold_1) {
    return config.discount_1 / 100;
  }
  return 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Accéder au boudoir & catalogue VIP exclusif')
    .setDMPermission(false),
  async execute(interaction, selectedItemName = null) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const itemName = selectedItemName || null;

    if (!itemName) {
      // Afficher la boutique (le catalogue)
      let items = db.prepare('SELECT * FROM shop WHERE guild_id = ?').all(guildId);

      if (items.length === 0) {
        db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
          .run(guildId, 'Suite Privée 1 Jour', 500, 'Votre suite privée personnelle et intimiste pendant 24h.', null);
        db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
          .run(guildId, 'Suite Privée 7 Jours', 2000, 'Votre suite privée personnelle et intimiste pendant toute une semaine.', null);
        db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
          .run(guildId, 'Suite Privée 1 Mois', 7000, 'Votre suite privée personnelle et intimiste pendant un mois entier.', null);
        db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
          .run(guildId, '🍀 Chance de Comptage', 300, 'Sauve une erreur dans le salon de comptage ! S\'utilise automatiquement.', null);
        
        items = db.prepare('SELECT * FROM shop WHERE guild_id = ?').all(guildId);
      } else {
        const hasChanceItem = items.some(it => it.item_name === '🍀 Chance de Comptage');
        if (!hasChanceItem) {
          db.prepare('INSERT OR REPLACE INTO shop (guild_id, item_name, price, description, role_id) VALUES (?, ?, ?, ?, ?)')
            .run(guildId, '🍀 Chance de Comptage', 300, 'Sauve une erreur dans le salon de comptage ! S\'utilise automatiquement.', null);
          items = db.prepare('SELECT * FROM shop WHERE guild_id = ?').all(guildId);
        }
      }

      const discount = getKarmaDiscount(guildId, userId);
      const karmaText = discount > 0 
        ? `🔥 **Privilège Karma Séducteur :** Réduction exclusive de **-${Math.round(discount * 100)}%** sur tout le catalogue !`
        : `✨ *Augmentez votre Karma pour débloquer jusqu'à **-20%** de privilège sur vos achats passionnés.*`;

      const embed = new EmbedBuilder()
        .setTitle(`🍷 🛍️ 𝔅𝔬𝔲𝔱𝔦𝔦𝔲𝔢 𝔓𝔯𝔢𝔪𝔦𝔲𝔪 & 𝔖𝔢𝔫𝔰𝔲𝔢𝔩𝔩𝔢 💋 👑`)
        .setDescription(`💋 **Bienvenue dans le Boudoir Exclusif & Torride de ${interaction.guild.name}**\n\n*Laissez-vous séduire par vos désirs les plus secrets... Offrez-vous des suites privées sensuelles, des rôles prestigieux et des avantages d'exception.* ✨\n\n${karmaText}\n\n👇 *Sélectionnez un plaisir ci-dessous dans le menu déroulant pour l'acquérir instantanément :*`)
        .setColor('#E74C3C')
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png')
        .setFooter({ text: '💋 Désirs Exclusifs, Ambiances Sensuelles & Passion • Boutique VIP', iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();

      items.forEach(item => {
        const finalPrice = Math.round(item.price * (1 - discount));
        let details = `💎 **Tarif :** \`${finalPrice} pièces\`${discount > 0 ? ` ~~(~~${item.price}~~ -${Math.round(discount * 100)}%)~~` : ''}\n👠 *${item.description || 'Aucune description.'}*`;
        if (item.role_id) {
          details += `\n✨ **Rôle attribué :** <@&${item.role_id}>`;
        }
        if (item.reward_xp > 0 || item.reward_karma > 0) {
          details += `\n⚡ **Bonus d'acquisition :** ${item.reward_xp > 0 ? `+${item.reward_xp} XP ` : ''}${item.reward_karma > 0 ? `+${item.reward_karma} Karma` : ''}`;
        }
        embed.addFields({ name: `🔥 ─── 『 ${item.item_name} 』`, value: details, inline: false });
      });

      const selectOptions = items.slice(0, 25).map(item => {
        const finalPrice = Math.round(item.price * (1 - discount));
        return {
          label: item.item_name.substring(0, 25),
          description: `${finalPrice} pièces${discount > 0 ? ` (-${Math.round(discount * 100)}%)` : ''} • Offrir / Acheter`,
          value: item.item_name,
          emoji: '💋'
        };
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('boutique_acheter')
        .setPlaceholder('💋 Choisissez votre plaisir et passez commande...')
        .addOptions(selectOptions);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // Afficher les options Acheter / Offrir pour l'article sélectionné
    const item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND item_name = ?').get(guildId, itemName);
    if (!item) {
      return interaction.reply({ content: `❌ L'article **${itemName}** n'existe pas dans la boutique.`, ephemeral: true });
    }

    const discount = getKarmaDiscount(guildId, userId);
    const finalPrice = Math.round(item.price * (1 - discount));

    const promptEmbed = new EmbedBuilder()
      .setTitle(`💋 Commande : ${item.item_name}`)
      .setDescription(`💎 **Tarif :** \`${finalPrice} pièces\`${discount > 0 ? ` ~~(~~${item.price}~~ -${Math.round(discount * 100)}%)~~` : ''}\n👠 *${item.description || ''}*\n\nSouhaitez-vous acheter cet article pour vous-même ou l'offrir en cadeau à un autre membre ?`)
      .setColor('#E74C3C')
      .setTimestamp();

    const buttonsRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`boutique_buy_self:${item.item_name}`)
        .setLabel('🛒 Acheter pour moi')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`boutique_gift_target:${item.item_name}`)
        .setLabel('🎁 Offrir à un membre')
        .setStyle(ButtonStyle.Primary)
    );

    if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
      return interaction.reply({ embeds: [promptEmbed], components: [buttonsRow], ephemeral: true });
    } else {
      return interaction.reply({ embeds: [promptEmbed], components: [buttonsRow], ephemeral: true });
    }
  },

  async processPurchase(interaction, itemName, targetUserId = null) {
    const guildId = interaction.guild.id;
    const buyerId = interaction.user.id;
    const recipientId = targetUserId || buyerId;
    const isGift = recipientId !== buyerId;

    const item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND item_name = ?').get(guildId, itemName);
    if (!item) {
      const msg = `❌ L'article **${itemName}** n'existe pas dans la boutique.`;
      return interaction.replied || interaction.deferred ? interaction.editReply({ content: msg }) : interaction.reply({ content: msg, ephemeral: true });
    }

    const economy = getEconomy(guildId, buyerId);
    const discount = getKarmaDiscount(guildId, buyerId);
    const finalPrice = Math.round(item.price * (1 - discount));

    if (economy.wallet < finalPrice) {
      const msg = `❌ Vous n'avez pas assez d'argent en poche. Cet article coûte **${finalPrice}** pièces, et vous n'en avez que **${economy.wallet}**.`;
      return interaction.replied || interaction.deferred ? interaction.editReply({ content: msg }) : interaction.reply({ content: msg, ephemeral: true });
    }

    const isSuite = item.item_name.toLowerCase().startsWith('suite privée');
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

      if (!interaction.deferred && !interaction.replied) await interaction.deferReply();

      updateEconomy(guildId, buyerId, { wallet: economy.wallet - finalPrice });

      const existingSuite = getPrivateSuite(guildId, recipientId);
      if (existingSuite) {
        const txtChan = interaction.guild.channels.cache.get(existingSuite.text_channel_id);
        if (txtChan) {
          const newExpiry = Math.max(Date.now(), existingSuite.expires_at) + durationMs;
          updatePrivateSuiteExpiry(guildId, recipientId, newExpiry);
          await txtChan.send(`🎉 **${isGift ? `<@${buyerId}> a offert une prolongation` : `<@${buyerId}> a prolongé cette suite`} de ${durationLabel} !**\nNouvelle date d'expiration : <t:${Math.floor(newExpiry / 1000)}:F>.`);

          return interaction.editReply({ content: isGift ? `🎁 **CADEAU OFFERT !** Vous avez offert **${durationLabel}** de Suite Privée à <@${recipientId}> pour **${finalPrice}** pièces !` : `🎉 Vous avez prolongé votre suite privée de **${durationLabel}** pour **${finalPrice}** pièces !` });
        }
      }

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
      const targetMember = await interaction.guild.members.fetch(recipientId).catch(() => null);
      const cleanUsername = (targetMember?.user?.username || 'vip').toLowerCase().replace(/[^a-z0-9]/g, '');
      const chanName = `${prefix}${cleanUsername}`.slice(0, 90);

      try {
        const textChannel = await interaction.guild.channels.create({
          name: chanName,
          type: ChannelType.GuildText,
          parent: category ? category.id : null,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: recipientId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AttachFiles] },
            { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        const expiresAt = Date.now() + durationMs;
        addPrivateSuite(guildId, recipientId, textChannel.id, null, expiresAt);

        const welcomeEmbed = new EmbedBuilder()
          .setTitle('👑 🛋️ ✨ BIENVENUE DANS VOTRE SUITE PRIVÉE VIP ✨ 🛋️ 👑')
          .setDescription(
            `🔥 **Félicitations <@${recipientId}> !** ${isGift ? `Ce havre de paix vous a été généreusement offert par <@${buyerId}> !` : `Vous prenez possession de votre Suite Privée d'Exception !`}\n\n` +
            `*Cet espace haut de gamme et entièrement sécurisé est votre havre d'intimité d'exception. Vous et vos invités privilégiés pouvez échanger en toute sérénité...* 🥂💋\n\n` +
            `⏳ **Durée de réservation :** Expire le <t:${Math.floor(expiresAt / 1000)}:F> (<t:${Math.floor(expiresAt / 1000)}:R>).\n`
          )
          .setColor('#F1C40F')
          .setTimestamp();

        const panelEmbed = new EmbedBuilder()
          .setTitle('🔑 🛋️ Panneau de Contrôle & Gestion de la Suite')
          .setDescription('Utilisez les boutons ci-dessous pour accorder ou retirer l\'accès à vos invités privilégiés.')
          .setColor('#9B59B6');

        const panelRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('suite_invite_btn').setLabel('Inviter un membre').setStyle(ButtonStyle.Success).setEmoji('➕'),
          new ButtonBuilder().setCustomId('suite_exclude_btn').setLabel('Exclure un membre').setStyle(ButtonStyle.Danger).setEmoji('➖')
        );

        await textChannel.send({ embeds: [welcomeEmbed, panelEmbed], components: [panelRow] }).catch(console.error);

        const giftEmbed = new EmbedBuilder()
          .setTitle('👑 🛋️ 🔥 SUITE PRIVÉE PASSONNÉE OFFERTE ! 💋 🛋️ 👑')
          .setDescription(
            `🔥 **<@${buyerId}>** a succombé au charme hypnotique de **<@${recipientId}>** et lui offre une luxueuse **${item.item_name}** !\n\n` +
            `*Un espace d'intimité exclusive, de luxe raffiné et de pure volupté vous attend... Laissez parler vos désirs les plus intenses.* 🥂💋\n\n` +
            `🔑 **Votre salon privatif discret :** <#${textChannel.id}>`
          )
          .setColor('#F1C40F')
          .setFooter({ text: '💋 Boudoir VIP & Moments Sensuels • B&G Elite' })
          .setTimestamp();

        return interaction.editReply({ 
          content: `💋 **Hey <@${recipientId}> ! Reçois ce cadeau passionné et torride offert par <@${buyerId}> !** 🔥✨`,
          embeds: [giftEmbed] 
        });
      } catch (err) {
        console.error('Erreur création suite:', err);
        updateEconomy(guildId, buyerId, { wallet: economy.wallet });
        return interaction.editReply({ content: '❌ Une erreur est survenue lors de la création de la suite. Vous avez été remboursé.' });
      }
    }

    // Standard items: deduct money from buyer
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
    updateEconomy(guildId, buyerId, { wallet: economy.wallet - finalPrice });

    // Add item to recipient's inventory
    const invItem = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, recipientId, item.item_name);
    if (invItem) {
      db.prepare('UPDATE inventory SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?').run(guildId, recipientId, item.item_name);
    } else {
      db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, 1)').run(guildId, recipientId, item.item_name);
    }

    let rewardsGiven = [];

    // Role reward
    if (item.role_id) {
      const role = interaction.guild.roles.cache.get(item.role_id);
      if (role) {
        const member = await interaction.guild.members.fetch(recipientId).catch(() => null);
        if (member) {
          try {
            await member.roles.add(role);
            if (item.role_duration_ms > 0) {
              const expiresAt = Date.now() + item.role_duration_ms;
              addTemporaryRole(guildId, recipientId, item.role_id, expiresAt);
              rewardsGiven.push(`le rôle temporaire **${role.name}** (${formatDuration(item.role_duration_ms)})`);
            } else {
              rewardsGiven.push(`le rôle permanent **${role.name}**`);
            }
          } catch (e) {
            rewardsGiven.push(`le rôle **${role.name}**`);
          }
        }
      }
    }

    // XP reward
    if (item.reward_xp > 0) {
      const member = await interaction.guild.members.fetch(recipientId).catch(() => null);
      if (member) {
        const { addXP } = require('../../utils/helpers');
        await addXP(interaction.guild, member, item.reward_xp, interaction.channel);
        rewardsGiven.push(`**+${item.reward_xp} XP**`);
      }
    }

    // Karma reward
    if (item.reward_karma > 0) {
      const recipientEconomy = getEconomy(guildId, recipientId);
      updateEconomy(guildId, recipientId, { karma: recipientEconomy.karma + item.reward_karma });
      rewardsGiven.push(`**+${item.reward_karma} Karma**`);
    }

    let rewardText = '';
    if (rewardsGiven.length > 0) {
      rewardText = `\n✨ **Récompense débloquée :** <@${recipientId}> a immédiatement reçu ${rewardsGiven.join(', ')} !`;
    }

    if (isGift) {
      const buyerMember = await interaction.guild.members.fetch(buyerId).catch(() => null);
      const recipientMember = await interaction.guild.members.fetch(recipientId).catch(() => null);

      const { generateAiGiftPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiGiftPhrase(buyerMember, recipientMember, item.item_name, guildId);

      const sexyQuotes = [
        "Un frisson de désir traverse la boutique... L'amour et le fantasme n'attendent pas. 💋",
        "Un geste brûlant d'élégance et de séduction pur jus... 🥂🔥",
        "Quand la tentation devient irrésistible, les plaisirs se partagent à deux... 👠✨",
        "Une délicieuse surprise envoûtante réservée à une personne d'exception... 💄💋"
      ];
      const randomQuote = aiPhrase || sexyQuotes[Math.floor(Math.random() * sexyQuotes.length)];

      const giftEmbed = new EmbedBuilder()
        .setTitle('🔥 🎁 💋 CADEAU TORRIDE & SENSUEL OFFERT ! 💋 🎁 🔥')
        .setDescription(
          `🔥 **Attention les yeux... Un désir secret vient d'être exaucé !** 💋\n\n` +
          `✨ **<@${buyerId}>** fait monter la température et fait fondre **<@${recipientId}>** en lui offrant **${item.item_name}** ! 👠🥂\n\n` +
          `>>> *"${randomQuote}"*\n${rewardText}`
        )
        .setColor('#E74C3C')
        .setFooter({ text: '💋 Boudoir VIP & Sensualité Exclusives • B&G Elite' })
        .setTimestamp();

      return interaction.editReply({ 
        content: `💋 **Hey <@${recipientId}> ! Ouvre vite tes bras... Reçois ce cadeau torride et enivrant offert par <@${buyerId}> !** 🔥✨`,
        embeds: [giftEmbed] 
      });
    } else {
      return interaction.editReply({ content: `🎉 **Achat réussi !** Vous avez acheté **${item.item_name}** pour **${finalPrice}** pièces${rewardText} !` });
    }
  }
};
