const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getLeveling, updateLeveling } = require('../../database/db');
const { addXP } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajouter')
    .setDescription('Gérer (ajouter, retirer, définir) les ressources et niveaux des membres (Staff)')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Action à effectuer')
        .setRequired(true)
        .addChoices(
          { name: '➕ Ajouter', value: 'ajouter' },
          { name: '➖ Retirer', value: 'retirer' },
          { name: '⚙️ Définir', value: 'definir' }
        ))
    .addStringOption(option =>
      option.setName('type')
        .setDescription('Type de ressource à modifier')
        .setRequired(true)
        .addChoices(
          { name: '💰 Argent', value: 'argent' },
          { name: '✨ Karma', value: 'karma' },
          { name: '⭐ XP', value: 'xp' },
          { name: '📈 Niveau', value: 'niveau' }
        ))
    .addUserOption(option =>
      option.setName('cible')
        .setDescription('Membre ciblé')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('valeur')
        .setDescription('Valeur ou quantité (supérieure ou égale à 0)')
        .setRequired(true)
        .setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(interaction) {
    const action = interaction.options.getString('action', true);
    const type = interaction.options.getString('type', true);
    const targetUser = interaction.options.getUser('cible', true);
    const valeur = interaction.options.getInteger('valeur', true);
    const guildId = interaction.guild.id;

    if (targetUser.bot) {
      return interaction.reply({ content: '🔞 Vous ne pouvez pas attribuer ou modifier de ressources sur un bot.', ephemeral: true });
    }

    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!member) {
      return interaction.reply({ content: '🔞 Membre introuvable sur ce serveur.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor('#E74C3C')
      .setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    let desc = '';

    // 1. ARGENT
    if (type === 'argent') {
      const eco = getEconomy(guildId, targetUser.id);
      let newVal = eco.wallet;
      
      if (action === 'ajouter') {
        newVal = eco.wallet + valeur;
        desc = `💋 Ajout de **💰 ${valeur} pièces** au portefeuille de <@${targetUser.id}> !`;
      } else if (action === 'retirer') {
        newVal = Math.max(0, eco.wallet - valeur);
        desc = `💋 Retrait de **💰 ${valeur} pièces** du portefeuille de <@${targetUser.id}> !`;
      } else if (action === 'definir') {
        newVal = valeur;
        desc = `💋 Le portefeuille de <@${targetUser.id}> a été défini à **💰 ${valeur} pièces** !`;
      }
      
      updateEconomy(guildId, targetUser.id, { wallet: newVal });
      embed.setTitle('💰 Ajustement du Portefeuille')
        .setDescription(`${desc}\n\n*Nouveau solde : **${newVal} pièces***`);
    } 
    
    // 2. KARMA
    else if (type === 'karma') {
      const eco = getEconomy(guildId, targetUser.id);
      let newVal = eco.karma;

      if (action === 'ajouter') {
        newVal = eco.karma + valeur;
        desc = `💋 **✨ ${valeur} Karma** ont été offerts à <@${targetUser.id}> !`;
      } else if (action === 'retirer') {
        newVal = Math.max(0, eco.karma - valeur);
        desc = `💋 **✨ ${valeur} Karma** ont été retirés à <@${targetUser.id}> !`;
      } else if (action === 'definir') {
        newVal = valeur;
        desc = `💋 Le Karma de <@${targetUser.id}> a été fixé à **✨ ${valeur}** !`;
      }

      updateEconomy(guildId, targetUser.id, { karma: newVal });
      embed.setTitle('✨ Ajustement du Karma')
        .setDescription(`${desc}\n\n*Nouveau Karma : **${newVal}***`);
    } 
    
    // 3. XP
    else if (type === 'xp') {
      const lvl = getLeveling(guildId, targetUser.id);
      let newVal = lvl.xp;

      if (action === 'ajouter') {
        await addXP(interaction.guild, member, valeur, interaction.channel);
        newVal = getLeveling(guildId, targetUser.id).xp;
        desc = `💋 **⭐ ${valeur} XP** ont été insufflés à <@${targetUser.id}> !`;
      } else if (action === 'retirer') {
        newVal = Math.max(0, lvl.xp - valeur);
        updateLeveling(guildId, targetUser.id, { xp: newVal });
        desc = `💋 **⭐ ${valeur} XP** ont été retirés à <@${targetUser.id}> !`;
      } else if (action === 'definir') {
        newVal = valeur;
        updateLeveling(guildId, targetUser.id, { xp: newVal });
        desc = `💋 L'XP de <@${targetUser.id}> a été définie à **⭐ ${valeur}** !`;
      }

      embed.setTitle('⭐ Ajustement de l\'XP')
        .setDescription(`${desc}\n\n*Nouvelle XP : **${newVal}***`);
    } 
    
    // 4. NIVEAU
    else if (type === 'niveau') {
      const lvl = getLeveling(guildId, targetUser.id);
      let newVal = lvl.level;

      if (action === 'ajouter') {
        newVal = lvl.level + valeur;
        desc = `💋 Le niveau de <@${targetUser.id}> a été augmenté de **📈 ${valeur} niveaux** !`;
      } else if (action === 'retirer') {
        newVal = Math.max(0, lvl.level - valeur);
        desc = `💋 Le niveau de <@${targetUser.id}> a été abaissé de **📈 ${valeur} niveaux** !`;
      } else if (action === 'definir') {
        newVal = valeur;
        desc = `💋 Le niveau de <@${targetUser.id}> a été défini au **📈 Niveau ${valeur}** !`;
      }

      updateLeveling(guildId, targetUser.id, { level: newVal });
      embed.setTitle('📈 Ajustement du Niveau')
        .setDescription(`${desc}\n\n*Nouveau Niveau : **Niveau ${newVal}***`);
    }

    return interaction.reply({ embeds: [embed] });
  }
};
