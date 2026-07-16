const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { getEconomy, updateEconomy } = require("../../database/db");

module.exports = {
  name: "dropargent",
  
  data: new SlashCommandBuilder()
    .setName("dropargent")
    .setDescription("Cr├®er un drop d argent pour le premier membre qui r├®agit")
    .addIntegerOption(option =>
      option.setName("montant")
        .setDescription("Montant d argent ├á gagner")
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalis├® (optionnel)")
        .setRequired(false))
    .setDMPermission(false),
  
  description: "Drop d argent pour le premier qui r├®agit",
  
  async execute(interaction) {
    const hasManageGuild = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
    if (!hasManageGuild) {
      return interaction.reply({ 
        content: "Ôøö Vous devez avoir la permission de g├®rer le serveur pour utiliser cette commande.", 
        ephemeral: true 
      });
    }

    const montant = interaction.options.getInteger("montant", true);
    const customMessage = interaction.options.getString("message", false);

    const embed = new EmbedBuilder()
      .setFooter({ text: "Boys and Girls - Soyez rapide, soyez audacieux" })
      .setTitle("­ƒÆ░ Tr├®sor Disponible")
      .setDescription(customMessage || "**" + montant + "** ­ƒ¬Ö attendent celui ou celle qui osera les saisir en premier...")
      .setColor("#FFD700")
      .addFields(
        { name: "­ƒÆÁ R├®compense", value: montant + " ­ƒ¬Ö", inline: true },
        { name: "ÔÜí Statut", value: "Disponible", inline: true }
      )
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("claim_money")
      .setLabel("­ƒÆ░ R├®clamer la r├®compense")
      .setStyle(ButtonStyle.Success);

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
          content: "ÔØî Trop tard... Quelqu un d autre a ├®t├® plus rapide que vous.", 
          ephemeral: true 
        });
      }

      if (btnInteraction.user.id === interaction.user.id) {
        return btnInteraction.reply({ 
          content: "ÔØî Vous ne pouvez pas r├®clamer votre propre tr├®sor.", 
          ephemeral: true 
        });
      }

      claimed = true;

      const winner = btnInteraction.user;
      const eco = getEconomy(interaction.guild.id, winner.id);
      updateEconomy(interaction.guild.id, winner.id, {
        wallet: eco.wallet + montant
      });

      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor("#00FF00")
        .spliceFields(1, 1, { name: "ÔÜí Statut", value: "R├®clam├® par " + winner.toString(), inline: true });

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel("Ô£à Tr├®sor r├®clam├®");

      const disabledRow = new ActionRowBuilder()
        .addComponents(disabledButton);

      await btnInteraction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      
      await btnInteraction.followUp({ 
        content: "­ƒÄë " + winner.toString() + " a su saisir sa chance et remporte **" + montant + "** ­ƒ¬Ö", 
        ephemeral: false 
      });

      collector.stop();
    });

    collector.on("end", async (collected, reason) => {
      if (!claimed && reason === "time") {
        const expiredEmbed = EmbedBuilder.from(embed)
          .setColor("#808080")
          .spliceFields(1, 1, { name: "ÔÜí Statut", value: "Expir├®", inline: true });

        const disabledButton = ButtonBuilder.from(button)
          .setDisabled(true)
          .setLabel("ÔÅ░ Trop tard");

        const disabledRow = new ActionRowBuilder()
          .addComponents(disabledButton);

        await message.edit({ embeds: [expiredEmbed], components: [disabledRow] }).catch(() => {});
      }
    });
  }
};
