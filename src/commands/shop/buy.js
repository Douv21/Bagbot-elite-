const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const { db, getEconomy, updateEconomy, getPrivateSuite, updatePrivateSuiteExpiry, addPrivateSuite } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('acheter')
    .setDescription('Acheter un article dans la boutique')
    .addStringOption(option => option.setName('nom').setDescription('Nom exact de l\'article').setRequired(true)),
  async execute(interaction) {
    const itemName = interaction.options.getString('nom');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    // Récupérer l'article de la boutique
    const item = db.prepare('SELECT * FROM shop WHERE guild_id = ? AND item_name = ?').get(guildId, itemName);

    if (!item) {
      return interaction.reply({ content: `❌ L'article **${itemName}** n'existe pas dans la boutique. Utilisez \`/shop\` pour voir les articles disponibles.`, ephemeral: true });
    }

    // Récupérer l'économie de l'utilisateur
    const economy = getEconomy(guildId, userId);

    if (economy.wallet < item.price) {
      return interaction.reply({ content: `❌ Vous n'avez pas assez d'argent en poche. Cet article coûte **${item.price}** pièces, et vous n'en avez que **${economy.wallet}**.`, ephemeral: true });
    }

    // Vérifier si l'article est une suite privée
    const isSuite = item.item_name.toLowerCase().startsWith('suite privée');
    if (isSuite) {
      let durationMs = 0;
      let durationLabel = '';
      if (/1\s*jour/i.test(item.item_name)) {
        durationMs = 24 * 60 * 60 * 1000;
        durationLabel = '1 jour';
      } else if (/7\s*jour/i.test(item.item_name)) {
        durationMs = 7 * 24 * 60 * 60 * 1000;
        durationLabel = '7 jours';
      } else if (/1\s*mois/i.test(item.item_name)) {
        durationMs = 30 * 24 * 60 * 60 * 1000;
        durationLabel = '1 mois';
      } else {
        durationMs = 24 * 60 * 60 * 1000;
        durationLabel = '1 jour';
      }

      await interaction.deferReply();

      // Retirer l'argent
      updateEconomy(guildId, userId, {
        wallet: economy.wallet - item.price
      });

      const existingSuite = getPrivateSuite(guildId, userId);
      if (existingSuite) {
        const txtChan = interaction.guild.channels.cache.get(existingSuite.text_channel_id);
        const vcChan = interaction.guild.channels.cache.get(existingSuite.voice_channel_id);
        
        if (txtChan || vcChan) {
          const newExpiry = Math.max(Date.now(), existingSuite.expires_at) + durationMs;
          updatePrivateSuiteExpiry(guildId, userId, newExpiry);

          if (txtChan) {
            await txtChan.send(`🎉 **<@${userId}> a prolongé cette suite de ${durationLabel} !**\nNouvelle date d'expiration : <t:${Math.floor(newExpiry / 1000)}:F> (<t:${Math.floor(newExpiry / 1000)}:R>).`);
          }

          return interaction.editReply({ content: `🎉 Vous avez prolongé votre suite privée existante de **${durationLabel}** pour **${item.price}** pièces !` });
        }
      }

      let category = interaction.guild.channels.cache.find(c => c.name === '🔑 Suites Privées' && c.type === ChannelType.GuildCategory);
      if (!category) {
        category = await interaction.guild.channels.create({
          name: '🔑 Suites Privées',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect]
            }
          ]
        }).catch(() => null);
      }

      try {
        const textChannel = await interaction.guild.channels.create({
          name: `suite-de-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          type: ChannelType.GuildText,
          parent: category ? category.id : null,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.ViewChannel]
            },
            {
              id: userId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.EmbedLinks,
                PermissionFlagsBits.AttachFiles
              ]
            },
            {
              id: interaction.client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ReadMessageHistory
              ]
            }
          ]
        });

        const voiceChannel = await interaction.guild.channels.create({
          name: `🎙️ Suite de ${interaction.user.username}`,
          type: ChannelType.GuildVoice,
          parent: category ? category.id : null,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.Connect]
            },
            {
              id: userId,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.Speak
              ]
            },
            {
              id: interaction.client.user.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.Connect,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ManageRoles
              ]
            }
          ]
        });

        const expiresAt = Date.now() + durationMs;
        addPrivateSuite(guildId, userId, textChannel.id, voiceChannel.id, expiresAt);

        await textChannel.send({
          content: `🎉 **Félicitations <@${userId}> ! Bienvenue dans votre Suite Privée !**\n\n` +
                   `Cette suite expirera le <t:${Math.floor(expiresAt / 1000)}:F> (<t:${Math.floor(expiresAt / 1000)}:R>).\n\n` +
                   `🛠️ **Commandes disponibles :**\n` +
                   `- \`/suite inviter <membre>\` : Permet d'inviter un membre à rejoindre votre suite privée.\n` +
                   `- \`/suite exclure <membre>\` : Permet de retirer l'accès à un membre de votre suite privée.\n` +
                   `- \`/suite quitter\` : Si vous êtes invité dans une suite, permet de la quitter.`
        }).catch(console.error);

        return interaction.editReply({ content: `🎉 Vous avez acheté une **${item.item_name}** pour **${item.price}** pièces ! Vos salons privatifs <#${textChannel.id}> et <#${voiceChannel.id}> ont été créés.` });
      } catch (err) {
        console.error('Erreur lors de la création de la suite:', err);
        updateEconomy(guildId, userId, {
          wallet: economy.wallet
        });
        return interaction.editReply({ content: `❌ Une erreur est survenue lors de la création des salons de votre suite privée. Vous avez été remboursé.` });
      }
    }

    // Retirer l'argent
    updateEconomy(guildId, userId, {
      wallet: economy.wallet - item.price
    });

    // Ajouter à l'inventaire
    const invItem = db.prepare('SELECT * FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name = ?').get(guildId, userId, item.item_name);

    if (invItem) {
      db.prepare('UPDATE inventory SET quantity = quantity + 1 WHERE guild_id = ? AND user_id = ? AND item_name = ?')
        .run(guildId, userId, item.item_name);
    } else {
      db.prepare('INSERT INTO inventory (guild_id, user_id, item_name, quantity) VALUES (?, ?, ?, 1)')
        .run(guildId, userId, item.item_name);
    }

    // Si l'objet donne un rôle, l'attribuer
    let roleGiven = '';
    if (item.role_id) {
      const role = interaction.guild.roles.cache.get(item.role_id);
      if (role) {
        const member = interaction.guild.members.cache.get(userId);
        if (member) {
          try {
            await member.roles.add(role);
            roleGiven = ` et le rôle <@&${item.role_id}> vous a été attribué !`;
          } catch (e) {
            console.error(e);
            roleGiven = `, mais je n'ai pas pu vous attribuer le rôle (vérifiez mes permissions).`;
          }
        }
      }
    }

    await interaction.reply({ content: `🎉 Vous avez acheté **${item.item_name}** pour **${item.price}** pièces${roleGiven} !` });
  }
};
