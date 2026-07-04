const { SlashCommandBuilder } = require('discord.js');
const { getEconomy, updateEconomy } = require('../../database/db');

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
      return interaction.reply({ content: `⏱️ Vos lignes sont emmêlées. Vous pourrez repêcher dans **${mins}m et ${secs}s**.`, ephemeral: true });
    }

    const rand = Math.random();
    let reply = '';
    let earnings = 0;
    let karmaGain = 1;

    if (rand < 0.3) {
      // Rien attrapé
      reply = '🎣 **Bredouille !** Le poisson a mangé l\'appât et s\'est enfui.';
    } else if (rand < 0.7) {
      // Poisson Commun
      earnings = Math.floor(Math.random() * 26) + 25; // 25 à 50
      reply = `🐟 **Pêche réussie !** Vous avez attrapé une **Sardine commune** vendue pour **💰 ${earnings} pièces** (Karma : **✨ +${karmaGain}**).`;
    } else if (rand < 0.9) {
      // Poisson Rare
      earnings = Math.floor(Math.random() * 51) + 70; // 70 à 120
      reply = `🐠 **Belle prise !** Vous avez attrapé un **Poisson-globe rare** vendu pour **💰 ${earnings} pièces** (Karma : **✨ +${karmaGain}**).`;
    } else {
      // Poisson Légendaire
      earnings = Math.floor(Math.random() * 201) + 200; // 200 à 400
      reply = `🦈 **Incroyable !** Vous avez harponné un **Grand Requin Blanc légendaire** vendu pour **💰 ${earnings} pièces** (Karma : **✨ +${karmaGain}**).`;
    }

    updateEconomy(guildId, userId, {
      wallet: economy.wallet + earnings,
      karma: economy.karma + (earnings > 0 ? karmaGain : 0),
      last_fish: now
    });

    await interaction.reply({ content: reply });
  }
};
