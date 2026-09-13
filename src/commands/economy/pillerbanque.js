const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionReward, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('piller-banque')
    .setDescription('Tenter de piller le compte bancaire d\'un autre membre (très risqué)')
    .addUserOption(option => option.setName('cible').setDescription('Le membre dont vous souhaitez piller la banque').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('cible');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (target.id === userId) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas piller votre propre banque !', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas piller la banque d\'un bot !', ephemeral: true });
    }

    const economy = getEconomy(guildId, userId);
    const targetEconomy = getEconomy(guildId, target.id);

    const isOwner = (interaction.guild && interaction.guild.ownerId === userId);

    const now = Math.floor(Date.now() / 1000);
    const cooldown = 10800; // 3 heures de délai de récupération

    if (!isOwner && economy.last_piller_banque && (now - economy.last_piller_banque) < cooldown) {
      const remaining = cooldown - (now - economy.last_piller_banque);
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ content: `⏱️ Les forces de l'ordre vous recherchent. Réessayez dans **${hours}h et ${mins}m**.`, ephemeral: true });
    }

    const userTotalMoney = (economy.wallet || 0) + (economy.bank || 0);
    if (userTotalMoney < 10 && !isOwner) {
      return interaction.reply({ content: '❌ Vous devez avoir au moins **10 pièces** au total pour organiser un pillage de banque.', ephemeral: true });
    }

    if ((targetEconomy.bank || 0) < 10) {
      return interaction.reply({ content: `❌ <@${target.id}> n'a rien sur son compte bancaire !`, ephemeral: true });
    }

    await interaction.deferReply();

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    const rewardConfig = getActionReward(guildId, 'piller_banque');
    const minStolen = rewardConfig ? rewardConfig.min_money : 200;
    const maxStolen = rewardConfig ? rewardConfig.max_money : 2000;
    const minKarma = rewardConfig ? rewardConfig.min_karma : -10;
    const maxKarma = rewardConfig ? rewardConfig.max_karma : -5;
    const configuredSuccessRate = (rewardConfig && rewardConfig.success_rate !== undefined && rewardConfig.success_rate !== null) ? rewardConfig.success_rate : 10;

    // RÈGLE SPÉCIALE OWNER : Le propriétaire du serveur (OWNER SEUL, pas les admins) a 100% de réussite garanti sans aucun échec possible !
    const success = isOwner ? true : (Math.random() * 100 < configuredSuccessRate);

    let amountMoney = 0;
    let karmaChange = 0;
    let title = '';
    let color = 0x000000;

    const currentEco = getEconomy(guildId, userId);
    const currentTargetEco = getEconomy(guildId, target.id);
    const userWallet = currentEco.wallet || 0;
    const userBank = currentEco.bank || 0;
    const targetBank = currentTargetEco.bank || 0;

    if (success) {
      // Pillage réussi de la banque de la cible
      const percent = Math.floor(Math.random() * 21) + 10; // 10% à 30% du solde bancaire
      const rawStolen = Math.floor((targetBank * percent) / 100);
      let stolen = Math.max(minStolen, Math.min(rawStolen, maxStolen));
      if (targetBank < stolen) {
        stolen = targetBank;
      }
      amountMoney = stolen;

      karmaChange = Math.floor(Math.random() * (maxKarma - minKarma + 1)) + minKarma;
      title = '🏦 Pillage de Banque Réussi !';
      color = 0x2ecc71;

      updateEconomy(guildId, userId, {
        wallet: userWallet + stolen,
        karma: (currentEco.karma || 0) + karmaChange,
        last_piller_banque: now
      });

      updateEconomy(guildId, target.id, {
        bank: Math.max(0, targetBank - stolen)
      });
    } else {
      // Échec : Amende et alarme déclenchée
      const fine = Math.floor(Math.random() * (maxStolen / 2 - minStolen + 1)) + minStolen;
      const totalUserMoney = userWallet + userBank;
      const fineDeducted = Math.min(totalUserMoney, fine);
      amountMoney = -fineDeducted;

      karmaChange = Math.floor(Math.random() * (maxKarma - minKarma + 1)) + minKarma;
      title = '🚨 Braquage Échoué - Alarme Déclenchée !';
      color = 0xe74c3c;

      let newWallet = userWallet - fineDeducted;
      let newBank = userBank;
      if (newWallet < 0) {
        newBank += newWallet; // Prélever le restant en banque si le portefeuille ne suffit pas
        newWallet = 0;
        if (newBank < 0) newBank = 0;
      }

      updateEconomy(guildId, userId, {
        wallet: newWallet,
        bank: newBank,
        karma: (currentEco.karma || 0) + karmaChange,
        last_piller_banque: now
      });
    }

    const extraContext = `Pillage de banque ciblant : ${targetMember ? targetMember.displayName : target.username}.`;
    const aiPhrase = await generateAiEconomyPhrase('piller_banque', interaction.member, amountMoney, karmaChange, success, guildId, extraContext);

    const gifs = getActionGifs(guildId, 'piller_banque');
    let gifUrl = null;
    if (gifs && gifs.length > 0) {
      const rawUrl = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (rawUrl && rawUrl.startsWith('/')) {
        const baseUrl = process.env.DASHBOARD_PUBLIC_URL || `http://${process.env.PUBLIC_IP || '82.65.75.176'}:49601`;
        gifUrl = `${baseUrl}${rawUrl}`;
      } else if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
        gifUrl = rawUrl;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(aiPhrase || (success ? `🏦 Vous avez réussi à braquer la banque de <@${target.id}> !` : `🚨 L'alarme de la banque de <@${target.id}> s'est déclenchée et vous avez dû payer une lourde amende !`))
      .setColor(color)
      .setTimestamp();

    if (gifUrl) {
      embed.setImage(gifUrl);
    }

    if (success) {
      embed.addFields(
        { name: '💰 Pièces pillées de la banque', value: `+${amountMoney} pièces`, inline: true },
        { name: '✨ Karma', value: `${karmaChange} karma`, inline: true }
      );
    } else {
      embed.addFields(
        { name: '💰 Amende d\'échec', value: `${amountMoney} pièces`, inline: true },
        { name: '✨ Karma', value: `${karmaChange} karma`, inline: true }
      );
    }

    const mention = target && target.id !== userId ? `<@${target.id}>` : null;

    if (mention && interaction.guild && interaction.channel) {
      await interaction.deleteReply().catch(() => null);
      await interaction.channel.send({
        content: mention,
        embeds: [embed],
        allowedMentions: { users: [target.id] }
      });
    } else {
      await interaction.editReply({
        content: mention,
        embeds: [embed],
        allowedMentions: mention ? { users: [target.id] } : { parse: [] }
      });
    }
  }
};
