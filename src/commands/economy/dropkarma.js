const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getEconomy, updateEconomy } = require("../../database/db");

module.exports = {
  name: "dropkarma",
  
  data: new SlashCommandBuilder()
    .setName("dropkarma")
    .setDescription("Créer un drop de Karma pour le premier membre qui réagit")
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
  
  description: "Drop de Karma pour le premier qui réagit",
  
  async execute(interaction) {
    const hasManageGuild = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
    if (!hasManageGuild) {
      return interaction.reply({ 
        content: "❌ Vous devez avoir la permission de gérer le serveur pour utiliser cette commande.", 
        ephemeral: true 
      });
    }

    const quantite = interaction.options.getInteger("quantite", true);
    const customMessage = interaction.options.getString("message", false);

    const embed = new EmbedBuilder()
      .setFooter({ text: "Boys and Girls - Répandez de bonnes ondes" })
      .setTitle("✨ Boost de Karma Disponible")
      .setDescription(customMessage || "**" + quantite + "** Karma sont offerts au premier qui les saisira...")
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
