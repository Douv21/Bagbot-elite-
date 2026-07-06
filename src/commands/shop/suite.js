const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getPrivateSuite, getPrivateSuiteByChannel } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suite')
    .setDescription('Gérer votre suite privée ou quitter une suite')
    .addSubcommand(sub =>
      sub
        .setName('inviter')
        .setDescription('Inviter un membre à rejoindre votre suite privée')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à inviter').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('exclure')
        .setDescription('Retirer un membre de votre suite privée')
        .addUserOption(opt => opt.setName('membre').setDescription('Le membre à exclure').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('quitter')
        .setDescription('Quitter la suite privée actuelle')
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (subcommand === 'inviter') {
      const suite = getPrivateSuite(guildId, userId);
      if (!suite) {
        return interaction.reply({ content: '❌ Vous ne possédez aucune suite privée active. Achetez-en une dans la boutique avec \`/acheter Suite Privée...\`.', ephemeral: true });
      }

      const targetMember = interaction.options.getMember('membre');
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
      }
      if (targetMember.id === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous inviter vous-même.', ephemeral: true });
      }

      const txtChan = interaction.guild.channels.cache.get(suite.text_channel_id);
      const vcChan = interaction.guild.channels.cache.get(suite.voice_channel_id);

      if (!txtChan && !vcChan) {
        return interaction.reply({ content: '❌ Les salons de votre suite privée semblent introuvables. Elle a peut-être expiré ou a été supprimée.', ephemeral: true });
      }

      try {
        if (txtChan) {
          await txtChan.permissionOverwrites.create(targetMember.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          });
        }
        if (vcChan) {
          await vcChan.permissionOverwrites.create(targetMember.id, {
            ViewChannel: true,
            Connect: true,
            Speak: true
          });
        }

        if (txtChan) {
          await txtChan.send(`👋 **Bienvenue <@${targetMember.id}> !** Vous avez été invité dans cette suite par <@${userId}>.`);
        }

        return interaction.reply({ content: `✅ <@${targetMember.id}> a été invité dans votre suite privée avec succès !`, ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Impossible de modifier les permissions du salon (permissions insuffisantes).', ephemeral: true });
      }
    }

    if (subcommand === 'exclure') {
      const suite = getPrivateSuite(guildId, userId);
      if (!suite) {
        return interaction.reply({ content: '❌ Vous ne possédez aucune suite privée active.', ephemeral: true });
      }

      const targetMember = interaction.options.getMember('membre');
      if (!targetMember) {
        return interaction.reply({ content: '❌ Membre introuvable.', ephemeral: true });
      }
      if (targetMember.id === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas vous exclure vous-même.', ephemeral: true });
      }

      const txtChan = interaction.guild.channels.cache.get(suite.text_channel_id);
      const vcChan = interaction.guild.channels.cache.get(suite.voice_channel_id);

      try {
        let removed = false;
        if (txtChan) {
          const ow = txtChan.permissionOverwrites.cache.get(targetMember.id);
          if (ow) {
            await ow.delete();
            removed = true;
          }
        }
        if (vcChan) {
          const ow = vcChan.permissionOverwrites.cache.get(targetMember.id);
          if (ow) {
            await ow.delete();
            removed = true;
          }
        }

        if (!removed) {
          return interaction.reply({ content: `❌ <@${targetMember.id}> n'est pas invité dans votre suite privée.`, ephemeral: true });
        }

        if (txtChan) {
          await txtChan.send(`🚫 <@${targetMember.id}> a été retiré de la suite privée.`);
          
          // Essayer d'éjecter l'utilisateur du salon vocal s'il y est connecté
          if (vcChan && targetMember.voice && targetMember.voice.channelId === vcChan.id) {
            await targetMember.voice.disconnect().catch(() => {});
          }
        }

        return interaction.reply({ content: `✅ <@${targetMember.id}> a été retiré de votre suite privée.`, ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Une erreur est survenue lors de la suppression des permissions.', ephemeral: true });
      }
    }

    if (subcommand === 'quitter') {
      const suite = getPrivateSuiteByChannel(interaction.channel.id);
      if (!suite) {
        return interaction.reply({ content: '❌ Cette commande doit être exécutée à l\'intérieur du salon textuel de la suite privée que vous souhaitez quitter.', ephemeral: true });
      }

      if (suite.user_id === userId) {
        return interaction.reply({ content: '❌ Vous êtes le propriétaire de cette suite privée. Vous ne pouvez pas la quitter, mais vous pouvez inviter ou exclure d\'autres membres.', ephemeral: true });
      }

      const txtChan = interaction.guild.channels.cache.get(suite.text_channel_id);
      const vcChan = interaction.guild.channels.cache.get(suite.voice_channel_id);

      try {
        if (txtChan) {
          const ow = txtChan.permissionOverwrites.cache.get(userId);
          if (ow) await ow.delete();
          await txtChan.send(`👋 <@${userId}> a quitté la suite privée.`);
        }
        if (vcChan) {
          const ow = vcChan.permissionOverwrites.cache.get(userId);
          if (ow) await ow.delete();
          
          const member = interaction.guild.members.cache.get(userId);
          if (member && member.voice && member.voice.channelId === vcChan.id) {
            await member.voice.disconnect().catch(() => {});
          }
        }

        return interaction.reply({ content: '✅ Vous avez quitté la suite privée.', ephemeral: true });
      } catch (err) {
        console.error(err);
        return interaction.reply({ content: '❌ Impossible de quitter la suite privée.', ephemeral: true });
      }
    }
  }
};
