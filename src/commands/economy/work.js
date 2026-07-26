const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('travailler')
    .setDescription('Travailler pour gagner des pièces et du karma'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);
    const now = Math.floor(Date.now() / 1000);
    const cooldown = 3600; // 1 heure en secondes

    if (economy.last_work && (now - economy.last_work) < cooldown) {
      const remaining = cooldown - (now - economy.last_work);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏱️ Travail accompli')
        .setDescription(`Vous êtes fatigué. Vous pourrez retravailler dans **${mins}m et ${secs}s** !`)
        .setColor(0xe74c3c);

      return interaction.reply({ 
        embeds: [cooldownEmbed], 
        ephemeral: true 
      });
    }

    await interaction.deferReply();

    const rewardConfig = getActionReward(guildId, 'travailler');
    const minReward = rewardConfig.min_money;
    const maxReward = rewardConfig.max_money;
    const earnings = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    const karmaGain = Math.floor(Math.random() * (rewardConfig.max_karma - rewardConfig.min_karma + 1)) + rewardConfig.min_karma;

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + earnings,
      karma: economy.karma + karmaGain,
      last_work: now
    });

    const aiPhrase = await generateAiEconomyPhrase('travailler', interaction.member, earnings, karmaGain, true, guildId);
    const defaultDesc = `💼 **${interaction.member.displayName}** a travaillé dur pour la communauté et récolte ses fruits !`;

    const gifs = getActionGifs(guildId, 'travailler');
    let gifUrl = null;
    if (gifs && gifs.length > 0) {
      gifUrl = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('💼 Travail accompli !')
      .setDescription(aiPhrase || defaultDesc)
      .addFields(
        { name: '💰 Pièces gagnées', value: `+${earnings} pièces`, inline: true }
      )
      .setColor(0x3498db)
      .setTimestamp();

    if (karmaGain > 0) {
      successEmbed.addFields({ name: '✨ Karma gagné', value: `+${karmaGain} karma`, inline: true });
    }

    if (gifUrl) {
      successEmbed.setImage(gifUrl);
    }

    await interaction.editReply({
      embeds: [successEmbed]
    });
  }
};
