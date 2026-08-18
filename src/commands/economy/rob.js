const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs } = require('../../database/db');
const { generateAiEconomyPhrase } = require('../../utils/aiActionHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voler')
    .setDescription('Tenter de voler les pièces d\'un autre membre')
    .addUserOption(option => option.setName('cible').setDescription('Le membre à détrousser').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options.getUser('cible');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (target.id === userId) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas vous voler vous-même !', ephemeral: true });
    }

    if (target.bot) {
      return interaction.reply({ content: '❌ Vous ne pouvez pas voler un bot !', ephemeral: true });
    }

    const economy = getEconomy(guildId, userId);
    const targetEconomy = getEconomy(guildId, target.id);

    const now = Math.floor(Date.now() / 1000);
    const cooldown = 10800; // 3 heures

    if (economy.last_rob && (now - economy.last_rob) < cooldown) {
      const remaining = cooldown - (now - economy.last_rob);
      const hours = Math.floor(remaining / 3600);
      const mins = Math.floor((remaining % 3600) / 60);
      return interaction.reply({ content: `⏱️ Vous devez vous faire discret. Réessayez dans **${hours}h et ${mins}m**.`, ephemeral: true });
    }

    if (economy.wallet < 100) {
      return interaction.reply({ content: '❌ Vous devez avoir au moins **100 pièces** en poche pour tenter un vol.', ephemeral: true });
    }

    if (targetEconomy.wallet < 100) {
      return interaction.reply({ content: `❌ <@${target.id}> est trop pauvre ! Il a moins de **100 pièces** en poche.`, ephemeral: true });
    }

    await interaction.deferReply();

    const targetMember = await interaction.guild.members.fetch(target.id).catch(() => null);
    const success = Math.random() < 0.45; // 45% de chance
    let stolen = 0;
    let karmaChange = 0;
    let title = '';
    let color = 0x000000;

    if (success) {
      // Voler entre 10% et 35% du portefeuille de la cible
      const percent = Math.floor(Math.random() * 26) + 10;
      stolen = Math.floor((targetEconomy.wallet * percent) / 100);
      karmaChange = -3;
      title = '💸 Vol Réussi !';
      color = 0x2ecc71;

      updateEconomy(guildId, userId, {
        wallet: economy.wallet + stolen,
        karma: economy.karma + karmaChange,
        last_rob: now
      });

      updateEconomy(guildId, target.id, {
        wallet: targetEconomy.wallet - stolen
      });
    } else {
      // Payer une amende à la cible (entre 50 et 150 pièces)
      const fine = Math.floor(Math.random() * 101) + 50;
      stolen = -Math.min(economy.wallet, fine);
      karmaChange = -1;
      title = '👮 Pris la main dans le sac !';
      color = 0xe74c3c;

      updateEconomy(guildId, userId, {
        wallet: economy.wallet + stolen,
        karma: economy.karma + karmaChange,
        last_rob: now
      });

      updateEconomy(guildId, target.id, {
        wallet: targetEconomy.wallet - stolen
      });
    }

    const extraContext = `Cible du vol: ${targetMember ? targetMember.displayName : target.username}.`;
    const aiPhrase = await generateAiEconomyPhrase('voler', interaction.member, stolen, karmaChange, success, guildId, extraContext);

    const gifs = getActionGifs(guildId, 'voler');
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
      .setDescription(aiPhrase || (success ? `💸 Vous avez réussi à détrousser <@${target.id}> !` : `👮 <@${target.id}> vous a surpris et vous avez payé une amende !`))
      .setColor(color)
      .setTimestamp();

    if (success) {
      embed.addFields(
        { name: '💰 Pièces volées', value: `+${stolen} pièces`, inline: true },
        { name: '✨ Karma', value: `${karmaChange} karma`, inline: true }
      );
    } else {
      embed.addFields(
        { name: '💰 Amende versée', value: `${stolen} pièces`, inline: true },
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


