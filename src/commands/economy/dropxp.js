const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { addXP } = require("../../utils/helpers");

module.exports = {
  name: "dropxp",
  
  data: new SlashCommandBuilder()
    .setName("dropxp")
    .setDescription("Créer un drop d'XP pour le premier membre qui réagit (Admin uniquement)")
    .addIntegerOption(option =>
      option.setName("quantite")
        .setDescription("Quantité d'XP à gagner")
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalisé (optionnel)")
        .setRequired(false))
    .setDMPermission(false),
  
  description: "Drop d'XP pour le premier qui réagit (Admin uniquement)",
  
  async execute(interaction) {
    const perms = interaction.memberPermissions;
    const isStaff = perms?.has(PermissionsBitField.Flags.Administrator) ||
                    perms?.has(PermissionsBitField.Flags.KickMembers) ||
                    perms?.has(PermissionsBitField.Flags.BanMembers) ||
                    perms?.has(PermissionsBitField.Flags.ModerateMembers) ||
                    perms?.has(PermissionsBitField.Flags.ManageMessages);
    if (!isStaff) {
      return interaction.reply({ 
        content: "❌ Vous devez disposer des autorisations de modération (Expulser, Bannir, Modérer ou Gérer les messages) pour créer un drop d'XP.", 
        ephemeral: true 
      });
    }

    const quantite = interaction.options.getInteger("quantite", true);
    let customMessage = interaction.options.getString("message", false);

    if (!customMessage) {
      const { generateAiDropPhrase } = require("../../utils/aiActionHelper");
      const aiDropText = await generateAiDropPhrase('dropxp', quantite, interaction.member, interaction.guild.id);
      customMessage = aiDropText || `⚡ **Drop d'Énergie XP !** <@${interaction.user.id}> largue **${quantite}** XP dans le salon ! Cliquez vite sur le bouton pour monter de niveau ! 🚀`;
    }

    const embed = new EmbedBuilder()
      .setFooter({ text: `${interaction.guild.name} • Soyez le plus rapide !` })
      .setTitle("✨ Boost d'Expérience (XP)")
      .setDescription(customMessage)
      .setColor("#9B59B6")
      .addFields(
        { name: "⭐ Récompense", value: quantite + " XP", inline: true },
        { name: "⚠️ Statut", value: "Disponible", inline: true }
      )
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("claim_xp")
      .setLabel("✨ Réclamer l'XP")
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
          content: "❌ Trop tard... Quelqu'un d'autre a été plus rapide que vous.", 
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
      await addXP(interaction.guild, btnInteraction.member, quantite, btnInteraction.channel);

      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor("#00FF00")
        .spliceFields(1, 1, { name: "⚠️ Statut", value: "Réclamé par " + winner.toString(), inline: true });

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel("✅ XP réclamé");

      const disabledRow = new ActionRowBuilder()
        .addComponents(disabledButton);

      await btnInteraction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      
      await btnInteraction.followUp({ 
        content: `🎉 ${winner.toString()} a prouvé sa détermination et gagne **${quantite}** XP !`, 
        ephemeral: false 
      });

      collector.stop();
    });

    collector.on("end", async (collected, reason) => {
      if (!claimed && reason === "time") {
        const expiredEmbed = EmbedBuilder.from(embed)
          .setColor("#808080")
          .spliceFields(1, 1, { name: "⚠️ Statut", value: "Expiré", inline: true });

        const disabledButton = ButtonBuilder.from(button)
          .setDisabled(true)
          .setLabel("⏰ Trop tard");

        const disabledRow = new ActionRowBuilder()
          .addComponents(disabledButton);

        await message.edit({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
      }
    });
  }
};
