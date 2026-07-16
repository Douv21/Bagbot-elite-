const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const { addXP } = require("../../utils/helpers");

module.exports = {
  name: "dropxp",
  
  data: new SlashCommandBuilder()
    .setName("dropxp")
    .setDescription("Cr├®er un drop d XP pour le premier membre qui r├®agit")
    .addIntegerOption(option =>
      option.setName("quantite")
        .setDescription("Quantit├® d XP ├á gagner")
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName("message")
        .setDescription("Message personnalis├® (optionnel)")
        .setRequired(false))
    .setDMPermission(false),
  
  description: "Drop d XP pour le premier qui r├®agit",
  
  async execute(interaction) {
    const hasManageGuild = interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild);
    if (!hasManageGuild) {
      return interaction.reply({ 
        content: "Ôøö Vous devez avoir la permission de g├®rer le serveur pour utiliser cette commande.", 
        ephemeral: true 
      });
    }

    const quantite = interaction.options.getInteger("quantite", true);
    const customMessage = interaction.options.getString("message", false);

    const embed = new EmbedBuilder()
      .setFooter({ text: "Boys and Girls - Montrez votre d├®termination" })
      .setTitle("Ô£¿ Boost d Exp├®rience")
      .setDescription(customMessage || "**" + quantite + "** XP sont offerts au plus d├®termin├® d entre vous...")
      .setColor("#9B59B6")
      .addFields(
        { name: "Ô¡É R├®compense", value: quantite + " XP", inline: true },
        { name: "ÔÜí Statut", value: "Disponible", inline: true }
      )
      .setTimestamp();

    const button = new ButtonBuilder()
      .setCustomId("claim_xp")
      .setLabel("Ô£¿ R├®clamer l XP")
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
          content: "ÔØî Trop tard... Quelqu un d autre a ├®t├® plus rapide que vous.", 
          ephemeral: true 
        });
      }

      if (btnInteraction.user.id === interaction.user.id) {
        return btnInteraction.reply({ 
          content: "ÔØî Vous ne pouvez pas r├®clamer votre propre boost.", 
          ephemeral: true 
        });
      }

      claimed = true;

      const winner = btnInteraction.user;
      await addXP(interaction.guild, btnInteraction.member, quantite, btnInteraction.channel);

      const updatedEmbed = EmbedBuilder.from(embed)
        .setColor("#00FF00")
        .spliceFields(1, 1, { name: "ÔÜí Statut", value: "R├®clam├® par " + winner.toString(), inline: true });

      const disabledButton = ButtonBuilder.from(button)
        .setDisabled(true)
        .setLabel("Ô£à XP r├®clam├®");

      const disabledRow = new ActionRowBuilder()
        .addComponents(disabledButton);

      await btnInteraction.update({ embeds: [updatedEmbed], components: [disabledRow] });
      
      await btnInteraction.followUp({ 
        content: "­ƒÄë " + winner.toString() + " a prouv├® sa d├®termination et gagne **" + quantite + "** XP", 
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
