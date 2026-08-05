const viderSalonsCmd = require('./viderSalons');
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Réinitialiser / vider un ou plusieurs salons (alias de /vider-salons)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(option =>
      option.setName('salon1')
        .setDescription('Premier salon à réinitialiser')
        .setRequired(true)
    )
    .addChannelOption(option =>
      option.setName('salon2')
        .setDescription('Deuxième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon3')
        .setDescription('Troisième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon4')
        .setDescription('Quatrième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon5')
        .setDescription('Cinquième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option.setName('salon6')
        .setDescription('Sixième salon à réinitialiser (optionnel)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('confirmation')
        .setDescription('Mode de confirmation')
        .setRequired(false)
        .addChoices(
          { name: 'Demander confirmation par bouton (Par défaut)', value: 'demander' },
          { name: 'Exécuter directement sans confirmation', value: 'immediat' }
        )
    ),

  async execute(interaction) {
    return viderSalonsCmd.execute(interaction);
  }
};
