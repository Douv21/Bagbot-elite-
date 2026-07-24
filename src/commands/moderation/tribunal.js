const {
  SlashCommandBuilder,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');

const storage = require('../../utils/tribunal_db');

// Simple in-memory wizard state (per user).
const sessions = new Map();
const SESSION_TTL_MS = 10 * 60 * 1000;

function now() { return Date.now(); }

function getSession(userId) {
  const s = sessions.get(userId);
  if (!s) return null;
  if (s.expiresAt && s.expiresAt < now()) {
    sessions.delete(userId);
    return null;
  }
  return s;
}

function upsertSession(userId, patch) {
  const current = getSession(userId) || { userId };
  const next = { ...current, ...patch, expiresAt: now() + SESSION_TTL_MS };
  sessions.set(userId, next);
  return next;
}

function buildEmbed(step, session) {
  const accused = session.accusedId ? `<@${session.accusedId}>` : '*Non sélectionné*';
  const lawyer = session.lawyerId ? `<@${session.lawyerId}>` : '*Aucun (ou à désigner par l\'accusé)*';
  const charge = session.charge ? session.charge : '*Aucun chef d\'accusation renseigné*';

  const titles = {
    accused: '⚖️ 👤 Étape 1/3 — Choix de l\'Accusé',
    lawyer: '⚖️ 💼 Étape 2/3 — Désignation de la Défense (Avocat)',
    charge: '⚖️ 📜 Étape 3/3 — Rédiger le Chef d\'Accusation',
    confirm: '✨ 🏛️ Récapitulatif & Validation du Dossier'
  };

  const descriptions = {
    accused: "🔍 Sélectionnez le membre mis en cause (**l'Accusé**) dans le menu déroulant ci-dessous.",
    lawyer: "💼 Choisissez un **Avocat** pour la défense ou passez cette étape si l'accusé le choisira lui-même.",
    charge: "📜 Cliquez sur le bouton ci-dessous pour saisir le **Chef d'accusation** motivant l'audience.",
    confirm: "🏛️ Vérifiez l'exactitude des informations et cliquez sur **`[ 🚀 Lancer le Procès ]`** pour ouvrir la séance."
  };

  const embed = new EmbedBuilder()
    .setColor('#8E24AA')
    .setTitle(titles[step] || '⚖️ 🏛️ TRIBUNAL & COUR DE JUSTICE')
    .setDescription(descriptions[step] || 'Suivi de la procédure judiciaire.')
    .addFields(
      { name: '👤 Accusé', value: accused, inline: true },
      { name: '💼 Avocat (Défense)', value: lawyer, inline: true },
      { name: '📜 Chef d\'Accusation', value: charge.length > 1024 ? charge.slice(0, 1021) + '…' : charge, inline: false },
    )
    .setFooter({ text: 'B&G Elite • Cour de Justice & Tribunal' })
    .setTimestamp(new Date());

  return embed;
}

function rowCancel(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tribunal:cancel:${ownerId}`)
      .setLabel('Annuler la procédure')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('❌')
  );
}

function rowAccused(ownerId) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tribunal:accused:${ownerId}`)
    .setPlaceholder("⚖️ Sélectionner l'accusé dans le serveur…")
    .setMinValues(1)
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    rowCancel(ownerId),
  ];
}

function rowLawyer(ownerId) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tribunal:lawyer:${ownerId}`)
    .setPlaceholder("💼 Sélectionner l'avocat de l'accusé (optionnel)…")
    .setMinValues(1)
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:skip_lawyer:${ownerId}`)
        .setLabel('Sans Avocat')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⏩'),
      new ButtonBuilder()
        .setCustomId(`tribunal:enter_charge:${ownerId}`)
        .setLabel('Entrer Accusation')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📜'),
    ),
    rowCancel(ownerId),
  ];
}

function rowCharge(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:enter_charge:${ownerId}`)
        .setLabel("Saisir Chef d'Accusation")
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📜'),
    ),
    rowCancel(ownerId),
  ];
}

function rowConfirm(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:confirm:${ownerId}`)
        .setLabel('🚀 Lancer le Procès')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tribunal:cancel:${ownerId}`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌'),
    )
  ];
}

function caseButtons(caseId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal_case:judge_take:${caseId}`)
        .setLabel('🧑‍⚖️ Juge : Prendre le Dossier')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`tribunal_case:accused_lawyer_pick:${caseId}`)
        .setLabel("💼 Accusé : Choisir l'Avocat")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tribunal_case:close:${caseId}`)
        .setLabel('🔨 Clôturer le Procès')
        .setStyle(ButtonStyle.Danger),
    )
  ];
}

function slugifyChannelName(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'proces';
}

async function getOrCreateTribunalCategory(guild, storage) {
  const gid = guild.id;
  const cfg = await storage.getTribunalConfig(gid);
  let byId = cfg.categoryId ? guild.channels.cache.get(cfg.categoryId) : null;
  if (!byId && cfg.categoryId) {
    byId = await guild.channels.fetch(cfg.categoryId).catch(() => null);
  }
  if (byId && byId.type === ChannelType.GuildCategory) return byId;

  const existing = guild.channels.cache.find(
    ch => ch.type === ChannelType.GuildCategory && /tribunal|procès|justice/i.test(ch.name || '')
  );
  if (existing) {
    await storage.updateTribunalConfig(gid, { categoryId: existing.id });
    return existing;
  }

  const created = await guild.channels.create({
    name: '⚖️ 🏛️ │ TRIBUNAL & JUSTICE',
    type: ChannelType.GuildCategory,
  });
  await storage.updateTribunalConfig(gid, { categoryId: created.id });
  return created;
}

function canActAsJudge(member) {
  try {
    if (!member) return false;
    return member.permissions?.has(PermissionFlagsBits.Administrator)
      || member.permissions?.has(PermissionFlagsBits.ModerateMembers)
      || member.permissions?.has(PermissionFlagsBits.ManageGuild);
  } catch (_) {
    return false;
  }
}

function isAdmin(member) {
  try {
    return Boolean(member?.permissions?.has?.(PermissionFlagsBits.Administrator));
  } catch (_) {
    return false;
  }
}

function caseEmbedFromRecord(rec) {
  return new EmbedBuilder()
    .setColor('#5E35B1')
    .setTitle(`🏛️ ⚖️ DOSSIER JUDICIAIRE N°${rec.id.slice(-6).toUpperCase()} — AUDIENCE OUVERTE ⚖️ 🏛️`)
    .setDescription(
      `🏛️ **La Cour de Justice du serveur est désormais ouverte !**\n\n` +
      `*Les débats peuvent commencer sous la haute autorité du Juge désigné. L'accusé, le plaignant et leurs avocats respectifs sont invités à faire valoir leurs arguments dans le respect et la discipline.* ⚖️`
    )
    .addFields(
      { name: '⚖️ Plaignant', value: rec.plaintiffId ? `<@${rec.plaintiffId}>` : '—', inline: true },
      { name: '👤 Accusé', value: rec.accusedId ? `<@${rec.accusedId}>` : '—', inline: true },
      { name: '🧑‍⚖️ Juge en Charge', value: rec.judgeId ? `<@${rec.judgeId}>` : '⏳ *En attente de désignation*', inline: true },
      { name: '💼 Avocat (Plaignant)', value: rec.plaintiffLawyerId ? `<@${rec.plaintiffLawyerId}>` : '*Aucun*', inline: true },
      { name: '💼 Avocat (Accusé)', value: rec.accusedLawyerId ? `<@${rec.accusedLawyerId}>` : '⏳ *À désigner par l\'accusé*', inline: true },
      { name: '📜 Chef d\'Accusation', value: rec.charge ? String(rec.charge).slice(0, 1024) : '—', inline: false },
      { name: '📌 Statut du Procès', value: rec.status === 'closed' ? '🔴 **Clôturé**' : '🟢 **Audience en cours**', inline: true },
    )
    .setFooter({ text: `B&G Elite • Tribunal Impérial • Dossier #${rec.id.slice(-6).toUpperCase()}` })
    .setTimestamp(new Date(rec.createdAt || Date.now()));
}

function ensureOwner(interaction, ownerId) {
  if (interaction.user.id !== ownerId) {
    try { interaction.reply({ content: '❌ Ce menu ne vous appartient pas.', ephemeral: true }); } catch (_) {}
    return false;
  }
  return true;
}

module.exports = {
  name: 'tribunal',

  data: new SlashCommandBuilder()
    .setName('tribunal')
    .setDescription('⚖️ 🏛️ Ouvrir un dossier judiciaire au Tribunal')
    .setDMPermission(false),

  async execute(interaction) {
    const ownerId = interaction.user.id;
    upsertSession(ownerId, { step: 'accused', accusedId: null, lawyerId: null, charge: '' });
    const embed = buildEmbed('accused', getSession(ownerId) || {});
    return interaction.reply({ embeds: [embed], components: rowAccused(ownerId), ephemeral: true });
  },

  async handleInteraction(interaction) {
    try {
      if (interaction.isButton() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal_case:')) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const caseId = parts[2];
        if (!caseId) return false;

        const record = await storage.getTribunalCase(interaction.guildId, caseId);
        if (!record) {
          try { await interaction.reply({ content: '❌ Dossier introuvable.', ephemeral: true }); } catch (_) {}
          return true;
        }

        if (action === 'close') {
          if (!canActAsJudge(interaction.member) && interaction.user.id !== record.plaintiffId && interaction.user.id !== record.judgeId) {
            try { await interaction.reply({ content: '❌ Seul un juge, un modérateur ou le plaignant peut clôturer le procès.', ephemeral: true }); } catch (_) {}
            return true;
          }

          await storage.upsertTribunalCase(interaction.guildId, caseId, { status: 'closed' });
          const updated = await storage.getTribunalCase(interaction.guildId, caseId);

          try { await interaction.deferUpdate(); } catch (_) {}
          const embed = caseEmbedFromRecord(updated);

          try {
            await interaction.message.edit({ embeds: [embed], components: [] });
          } catch (_) {}

          try {
            await interaction.channel.send({ content: `🔴 **PROCÈS CLÔTURÉ** par <@${interaction.user.id}>. Le salon sera archivé.` });
          } catch (_) {}

          return true;
        }

        if (action === 'judge_take') {
          if (!canActAsJudge(interaction.member)) {
            try { await interaction.reply({ content: '❌ Seul un membre du Staff (Modérateur/Admin) peut agir en tant que Juge.', ephemeral: true }); } catch (_) {}
            return true;
          }

          if (record.judgeId && record.judgeId === interaction.user.id) {
            try { await interaction.reply({ content: ' Vous êtes déjà le juge de ce procès.', ephemeral: true }); } catch (_) {}
            return true;
          }

          await storage.upsertTribunalCase(interaction.guildId, caseId, { judgeId: interaction.user.id });
          const updated = await storage.getTribunalCase(interaction.guildId, caseId);

          try { await interaction.deferUpdate(); } catch (_) {}
          const embed = caseEmbedFromRecord(updated);
          try { await interaction.message.edit({ embeds: [embed], components: caseButtons(caseId) }); } catch (_) {}
          try { await interaction.channel.send({ content: `🧑‍⚖️ <@${interaction.user.id}> a pris officiellement en charge ce procès en tant que **Juge**.` }); } catch (_) {}

          return true;
        }

        if (action === 'accused_lawyer_pick') {
          if (interaction.user.id !== record.accusedId && !isAdmin(interaction.member)) {
            try { await interaction.reply({ content: '❌ Seul l\'accusé (ou un admin) peut choisir son avocat.', ephemeral: true }); } catch (_) {}
            return true;
          }

          const select = new UserSelectMenuBuilder()
            .setCustomId(`tribunal_case:pick_lawyer_select:${caseId}`)
            .setPlaceholder("💼 Choisir l'avocat de la défense…")
            .setMinValues(1)
            .setMaxValues(1);

          const row = new ActionRowBuilder().addComponents(select);
          try { await interaction.reply({ content: '💼 **Sélectionnez votre avocat dans la liste :**', components: [row], ephemeral: true }); } catch (_) {}
          return true;
        }
      }

      if (interaction.isUserSelectMenu() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal_case:pick_lawyer_select:')) {
        const caseId = interaction.customId.split(':')[2];
        const picked = interaction.values?.[0];
        if (caseId && picked) {
          await storage.upsertTribunalCase(interaction.guildId, caseId, { accusedLawyerId: String(picked) });
          const updated = await storage.getTribunalCase(interaction.guildId, caseId);

          try { await interaction.deferUpdate(); } catch (_) {}

          if (updated.channelId) {
            const ch = interaction.guild.channels.cache.get(updated.channelId);
            if (ch && updated.panelMessageId) {
              const msg = await ch.messages.fetch(updated.panelMessageId).catch(() => null);
              if (msg) {
                const embed = caseEmbedFromRecord(updated);
                await msg.edit({ embeds: [embed], components: caseButtons(caseId) }).catch(() => {});
              }
            }
            if (ch) {
              await ch.permissionOverwrites.edit(picked, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
              await ch.send({ content: `💼 **Avocat de l'accusé désigné :** <@${picked}>` }).catch(() => {});
            }
          }
          try { await interaction.followUp({ content: `✅ Avocat sélectionné avec succès: <@${picked}>`, ephemeral: true }); } catch (_) {}
          return true;
        }
      }

      if (interaction.isButton() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:')) {
        const [, action, ownerId] = interaction.customId.split(':');
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;

        if (action === 'cancel') {
          try { await interaction.deferUpdate(); } catch (_) {}
          sessions.delete(ownerId);
          try { await interaction.editReply({ content: '✅ Procédure du Tribunal annulée.', embeds: [], components: [] }); } catch (_) {}
          return true;
        }

        if (action === 'skip_lawyer') {
          try { await interaction.deferUpdate(); } catch (_) {}
          const s = upsertSession(ownerId, { lawyerId: null, step: 'charge' });
          const embed = buildEmbed('charge', s);
          try { await interaction.editReply({ embeds: [embed], components: rowCharge(ownerId) }); } catch (_) {}
          return true;
        }

        if (action === 'enter_charge') {
          const modal = new ModalBuilder()
            .setCustomId(`tribunal:charge_modal:${ownerId}`)
            .setTitle("Chef d'accusation");
          const input = new TextInputBuilder()
            .setCustomId('charge')
            .setLabel("Motif / Chef d'accusation")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(900)
            .setPlaceholder('Ex: Vol de cookies, trahison envers la communauté, non-respect des règles…');
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return true;
        }

        if (action === 'confirm') {
          try { await interaction.deferUpdate(); } catch (_) {}
          const s = getSession(ownerId);
          if (!s || !s.accusedId) {
            try { await interaction.editReply({ content: '❌ Session expirée. Relancez `/tribunal`.', embeds: [], components: [] }); } catch (_) {}
            return true;
          }
          const guild = interaction.guild;
          if (!guild) {
            try { await interaction.editReply({ content: '❌ Impossible (hors serveur).', embeds: [], components: [] }); } catch (_) {}
            return true;
          }

          const caseId = String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8);
          const record = await storage.upsertTribunalCase(guild.id, caseId, {
            id: caseId,
            createdAt: Date.now(),
            status: 'open',
            plaintiffId: ownerId,
            accusedId: String(s.accusedId),
            plaintiffLawyerId: s.lawyerId ? String(s.lawyerId) : '',
            accusedLawyerId: '',
            judgeId: '',
            charge: String(s.charge || '').trim(),
            channelId: '',
            panelMessageId: '',
          });

          const category = await getOrCreateTribunalCategory(guild, storage);
          const accusedMember = await guild.members.fetch(record.accusedId).catch(() => null);
          const accusedName = accusedMember?.displayName || accusedMember?.user?.username || 'accuse';
          const chanName = `⚖️┆procès-${slugifyChannelName(accusedName)}`.slice(0, 90);

          const overwrites = [
            {
              id: guild.members.me.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageMessages,
              ],
            },
          ];

          const caseChannel = await guild.channels.create({
            name: chanName,
            type: ChannelType.GuildText,
            parent: category.id,
            topic: `Dossier tribunal ${caseId} • Accusé=${record.accusedId} • Plaignant=${record.plaintiffId}`,
            permissionOverwrites: overwrites,
            nsfw: true,
          });

          await storage.upsertTribunalCase(guild.id, caseId, { channelId: caseChannel.id });

          const panelEmbed = caseEmbedFromRecord(record);
          const content = `⚖️ 🏛️ **PROCÈS OUVERT** — ${caseChannel}\nPlaignant: <@${record.plaintiffId}> • Accusé: <@${record.accusedId}>`;
          const panelMsg = await caseChannel.send({ content, embeds: [panelEmbed], components: caseButtons(caseId) }).catch(() => null);
          if (panelMsg?.id) {
            await storage.upsertTribunalCase(guild.id, caseId, { panelMessageId: panelMsg.id });
          }

          sessions.delete(ownerId);
          try {
            await interaction.editReply({
              content: `✨ **Dossier judiciaire ouvert avec succès !** Rendez-vous dans ${caseChannel}.`,
              embeds: [],
              components: []
            });
          } catch (_) {}
          return true;
        }
      }

      if (interaction.isUserSelectMenu() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:')) {
        const [, field, ownerId] = interaction.customId.split(':');
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;

        const picked = interaction.values?.[0];
        if (!picked) return true;

        try { await interaction.deferUpdate(); } catch (_) {}

        if (field === 'accused') {
          const s = upsertSession(ownerId, { accusedId: String(picked), step: 'lawyer' });
          const embed = buildEmbed('lawyer', s);
          try { await interaction.editReply({ embeds: [embed], components: rowLawyer(ownerId) }); } catch (_) {}
          return true;
        }

        if (field === 'lawyer') {
          const s = upsertSession(ownerId, { lawyerId: String(picked), step: 'charge' });
          const embed = buildEmbed('charge', s);
          try { await interaction.editReply({ embeds: [embed], components: rowCharge(ownerId) }); } catch (_) {}
          return true;
        }
      }

      if (interaction.isModalSubmit() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:charge_modal:')) {
        const ownerId = interaction.customId.split(':')[2];
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;

        const val = interaction.fields.getTextInputValue('charge') || '';
        try { await interaction.deferUpdate(); } catch (_) {}

        const s = upsertSession(ownerId, { charge: val.trim(), step: 'confirm' });
        const embed = buildEmbed('confirm', s);
        try { await interaction.editReply({ embeds: [embed], components: rowConfirm(ownerId) }); } catch (_) {}
        return true;
      }

    } catch (err) {
      console.error('Erreur handleInteraction tribunal:', err);
    }

    return false;
  }
};
