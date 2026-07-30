const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getEconomy, updateEconomy } = require("../../database/db");

module.exports = {
  name: "dropkarma",
  
  data: new SlashCommandBuilder()
    .setName("dropkarma")
    .setDescription("Créer un drop de Karma pour le premier membre qui réagit (Admin uniquement)")
    .addIntegerOption(option =>
      option.setName("quantite")
        .setDescription("Quantité de Karma à gagner")
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalisé (optionnel)")
        .setRequired(false))
    .setDMPermission(false),
  
  description: "Drop de Karma pour le premier qui réagit (Admin uniquement)",
  
  async execute(interaction) {
    const perms = interaction.memberPermissions || interaction.member?.permissions;
    const userRoleIds = interaction.member?.roles?.cache ? Array.from(interaction.member.roles.cache.keys()) : (Array.isArray(interaction.member?.roles) ? interaction.member.roles : []);
    
    const { getPermissionsConfig } = require("../../database/db");
    let modoCmdsRoles = [];
    try {
      const permConfig = getPermissionsConfig(interaction.guild.id);
      modoCmdsRoles = typeof permConfig.modo_cmds_roles === 'string' ? JSON.parse(permConfig.modo_cmds_roles || '[]') : (permConfig.modo_cmds_roles || []);
      if (permConfig.modo_role_id) modoCmdsRoles.push(permConfig.modo_role_id);
    } catch (_) {}

    const isStaff = Boolean(
      perms?.has(PermissionsBitField.Flags.Administrator) ||
      perms?.has(PermissionsBitField.Flags.KickMembers) ||
      perms?.has(PermissionsBitField.Flags.BanMembers) ||
      perms?.has(PermissionsBitField.Flags.ModerateMembers) ||
      perms?.has(PermissionsBitField.Flags.ManageMessages) ||
      modoCmdsRoles.some(rId => userRoleIds.includes(rId))
    );
    if (!isStaff) {
      return interaction.reply({ 
        content: "❌ Vous devez disposer des autorisations de modération (Expulser, Bannir, Modérer ou Gérer les messages) ou d'un rôle Staff pour créer un drop de Karma.", 
        ephemeral: true 
      });
    }

    const quantite = interaction.options.getInteger("quantite", true);
    let customMessage = interaction.options.getString("message", false);

    if (!customMessage) {
      const { generateAiDropPhrase } = require("../../utils/aiActionHelper");
      const aiDropText = await generateAiDropPhrase('dropkarma', quantite, interaction.member, interaction.guild.id);
      customMessage = aiDropText || `✨ **Pluie de Karma Sacré !** <@${interaction.user.id}> offre un largage de **${quantite}** ✨ Karma ! Cliquez en premier sur le bouton ! 💎`;
    }

    const embed = new EmbedBuilder()
      .setFooter({ text: `${interaction.guild.name} • Soyez le plus rapide !` })
      .setTitle("✨ Boost de Karma Disponible")
      .setDescription(customMessage)
      .setColor("#E1C4FF")
      .addFields(
        { name: "✨ Récompense", value: quantite + " Karma", inline: true },
        { name: "⚠️ Statut", value: "Disponible", inline: true }
      )
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("claim_karma")
      .setLabel("✨ Réclamer le Karma")
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder()
      .addComponents(button);

    await interaction.reply({ embeds: [embed], components: [row] });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ 
      time: 60000
    });

    let claimed = false;

    collector.on("collect", async (btnInteraction) => {
      if (claimed) {
        return btnInteraction.reply({ 
          content: "❌ Trop tard... Quelqu'un d'autre a été plus rapide.", 
          ephemeral: true 
        });
      }

      if (btnInteraction.user.id === interaction.user.id) {
        return btnInteraction.reply({ 
          content: "❌ Vous ne pouvez pas réclamer votre propre boost.", 
          ephemeral: true 
        });
      }

      claimed = true;

      const winner = btnInteraction.user;
      const eco = getEconomy(interaction.guild.id, winner.id);
      updateEconomy(interaction.guild.id, winner.id, {
        karma: eco.karma + quantite
      });

      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor("#00FF00")
        .spliceFields(1, 1, { name: "⚠️ Statut", value: "Réclamé par " + winner.toString(), inline: true });

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel("✅ Karma réclamé");

      const disabledRow = new ActionRowBuilder()
        .addComponents(disabledButton);

      await btnInteraction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      
      await btnInteraction.followUp({ 
        content: `🎉 ${winner.toString()} a réclamé les **${quantite}** Karma avec succès !`, 
        ephemeral: false 
      });

      collector.stop();
    });

    collector.on("end", async () => {
      if (!claimed) {
        const expiredEmbed = EmbedBuilder.from(embed)
          .setColor("#FF0000")
          .spliceFields(1, 1, { name: "⚠️ Statut", value: "Expiré", inline: true });

        const disabledButton = ButtonBuilder.from(button)
          .setDisabled(true)
          .setLabel("Expiré");

        const disabledRow = new ActionRowBuilder()
          .addComponents(disabledButton);

        try {
          await interaction.editReply({ embeds: [expiredEmbed], components: [disabledRow] });
        } catch (_) {}
      }
    });
  }
};
