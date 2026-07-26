const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pecher')
    .setDescription('Aller à la pêche pour attraper des poissons et les vendre'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const economy = getEconomy(guildId, userId);
    const now = Math.floor(Date.now() / 1000);
    const cooldown = 900; // 15 minutes en secondes

    if (economy.last_fish && (now - economy.last_fish) < cooldown) {
      const remaining = cooldown - (now - economy.last_fish);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏱️ Session de Pêche')
        .setDescription(`Vos lignes sont emmêlées. Vous pourrez repêcher dans **${mins}m et ${secs}s** !`)
        .setColor(0xe74c3c);

      return interaction.reply({ 
        embeds: [cooldownEmbed], 
        ephemeral: true 
      });
    }

    await interaction.deferReply();

    const rewardConfig = getActionReward(guildId, 'pecher');
    const minReward = rewardConfig.min_money;
    const maxReward = rewardConfig.max_money;
    const karmaGain = Math.floor(Math.random() * (rewardConfig.max_karma - rewardConfig.min_karma + 1)) + rewardConfig.min_karma;

    const rand = Math.random();
    let title = '🎣 Partie de Pêche';
    let defaultDesc = '';
    let fishName = '';
    let earnings = 0;
    let color = 0x95a5a6;

    if (rand < 0.3) {
      // Rien attrapé
      fishName = 'Bredouille';
      defaultDesc = '🎣 **Bredouille !** Le poisson a mangé l\'appât et s\'est enfui.';
      color = 0x95a5a6;
    } else if (rand < 0.7) {
      // Poisson Commun
      fishName = 'Sardine commune';
      const subMin = minReward;
      const subMax = Math.max(subMin, Math.floor(minReward + (maxReward - minReward) * 0.15));
      earnings = Math.floor(Math.random() * (subMax - subMin + 1)) + subMin;
      defaultDesc = `🐟 **Pêche réussie !** Vous avez attrapé une **Sardine commune** vendue pour **💰 ${earnings} pièces** !`;
      color = 0x2ecc71;
    } else if (rand < 0.9) {
      // Poisson Rare
      fishName = 'Poisson-globe rare';
      const subMin = Math.floor(minReward + (maxReward - minReward) * 0.15);
      const subMax = Math.max(subMin, Math.floor(minReward + (maxReward - minReward) * 0.4));
      earnings = Math.floor(Math.random() * (subMax - subMin + 1)) + subMin;
      defaultDesc = `🐠 **Belle prise !** Vous avez attrapé un **Poisson-globe rare** vendu pour **💰 ${earnings} pièces** !`;
      color = 0x3498db;
    } else {
      // Poisson Légendaire
      fishName = 'Grand Requin Blanc légendaire';
      const subMin = Math.floor(minReward + (maxReward - minReward) * 0.4);
      const subMax = maxReward;
      earnings = Math.floor(Math.random() * (subMax - subMin + 1)) + subMin;
      defaultDesc = `🦈 **Incroyable !** Vous avez harponné un **Grand Requin Blanc légendaire** vendu pour **💰 ${earnings} pièces** !`;
      color = 0x9b59b6;
    }

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + earnings,
      karma: economy.karma + (earnings > 0 ? karmaGain : 0),
      last_fish: now
    });

    const extraContext = `Poisson pêché: ${fishName}`;
    const aiPhrase = await generateAiEconomyPhrase('pecher', interaction.member, earnings, (earnings > 0 ? karmaGain : 0), earnings > 0, guildId, extraContext);

    const gifs = getActionGifs(guildId, 'pecher');
    let gifUrl = null;
    if (gifs && gifs.length > 0) {
      gifUrl = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(aiPhrase || defaultDesc)
      .setColor(color)
      .setTimestamp();

    if (earnings > 0) {
      embed.addFields(
        { name: '💰 Pièces gagnées', value: `+${earnings} pièces`, inline: true }
      );
      if (karmaGain > 0) {
        embed.addFields(
          { name: '✨ Karma gagné', value: `+${karmaGain} karma`, inline: true }
        );
      }
    }

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    await interaction.editReply({ embeds: [embed] });
  }
};
