const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserQuests } = require('../../database/db');

module.exports = {
  category: 'économie',
  data: new SlashCommandBuilder()
    .setName('quetes')
    .setDescription('Afficher vos quêtes en cours, leur progression et vos récompenses'),
  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const quests = getUserQuests(guildId, userId);

    if (!quests || quests.length === 0) {
      return interaction.reply({
        content: '📜 **Aucune quête active sur ce serveur pour le moment.** Revenez plus tard !',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('📜 Vos Quêtes & Missions Discord')
      .setDescription(`Voici la liste de vos quêtes actives sur **${interaction.guild.name}**.\nAccomplissez-les pour gagner des pièces, de l'XP, du Karma et des rôles exclusifs !`)
      .setColor('#F1C40F')
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    quests.forEach((q, index) => {
      const isDone = q.completed;
      const pct = Math.min(100, Math.round((q.current_count / q.target_count) * 100));
      
      const progressBarLength = 10;
      const filled = Math.round((pct / 100) * progressBarLength);
      const empty = progressBarLength - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      let typeLabel = '💬 Messages';
      if (q.quest_type === 'reactions') typeLabel = '⭐ Réactions';
      else if (q.quest_type === 'confession') typeLabel = '🤫 Confessions';
      else if (q.quest_type === 'photo_selfie') typeLabel = '🤳 Selfie';
      else if (q.quest_type === 'photo_nude') typeLabel = '🔞 Photo NSFW/Nude';
      else if (q.quest_type === 'photo_outfit') typeLabel = '👗 Outfit/Tenue';
      else if (q.quest_type === 'custom') typeLabel = '🎯 Action Spéciale';

      let statusBadge = isDone ? '✅ **TERMINÉE**' : `⏳ **EN COURS** (${q.current_count}/${q.target_count})`;
      let rewardsStr = [];
      if (q.reward_money > 0) rewardsStr.push(`💰 +${q.reward_money} pièces`);
      if (q.reward_xp > 0) rewardsStr.push(`⚡ +${q.reward_xp} XP`);
      if (q.reward_karma > 0) rewardsStr.push(`⭐ +${q.reward_karma} Karma`);
      if (q.reward_role_id) rewardsStr.push(`🎭 <@&${q.reward_role_id}>`);

      let channelsInfo = '';
      if (q.channel_ids && q.channel_ids.length > 0) {
        channelsInfo = `\n📌 Salons autorisés : ${q.channel_ids.map(id => `<#${id}>`).join(', ')}`;
      }

      embed.addFields({
        name: `#${index + 1} ${isDone ? '✅' : '📜'} ${q.title} (${typeLabel})`,
        value: `${q.description ? q.description + '\n' : ''}Statut : ${statusBadge}\nProgression : \`[${bar}]\` ${pct}%\n🏆 Récompenses : ${rewardsStr.length > 0 ? rewardsStr.join(' • ') : 'Aucune'}${channelsInfo}`
      });
    });

    await interaction.reply({ embeds: [embed] });
  }
};
