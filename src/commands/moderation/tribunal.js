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
// Note: this intentionally avoids persistence; it's just a UI flow helper.
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
  const accused = session.accusedId ? `<@${session.accusedId}>` : 'ÔÇö';
  const lawyer = session.lawyerId ? `<@${session.lawyerId}>` : 'ÔÇö';
  const charge = session.charge ? session.charge : 'ÔÇö';

  const embed = new EmbedBuilder()
    .setColor(0x8e24aa)
    .setTitle('ÔÜû´©Å Tribunal')
    .setDescription(
      step === 'accused' ? 'Choisis **lÔÇÖaccus├®**.' :
      step === 'lawyer' ? 'Choisis **lÔÇÖavocat** (optionnel).' :
      step === 'charge' ? 'Entre le **chef dÔÇÖaccusation**.' :
      step === 'confirm' ? 'V├®rifie le r├®cap et **valide**.' :
      'Suivi du dossier.'
    )
    .addFields(
      { name: 'Accus├®', value: accused, inline: true },
      { name: 'Avocat', value: lawyer, inline: true },
      { name: 'Chef dÔÇÖaccusation', value: charge.length > 1024 ? charge.slice(0, 1021) + 'ÔÇª' : charge, inline: false },
    )
    .setFooter({ text: 'BAG ÔÇó Tribunal' })
    .setTimestamp(new Date());

  return embed;
}

function rowCancel(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tribunal:cancel:${ownerId}`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Secondary)
  );
}

function rowAccused(ownerId) {
  const select = new UserSelectMenuBuilder()
    .setCustomId(`tribunal:accused:${ownerId}`)
    .setPlaceholder('S├®lectionner lÔÇÖaccus├®ÔÇª')
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
    .setPlaceholder('S├®lectionner lÔÇÖavocat (optionnel)ÔÇª')
    .setMinValues(1)
    .setMaxValues(1);
  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:skip_lawyer:${ownerId}`)
        .setLabel('Sans avocat')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tribunal:enter_charge:${ownerId}`)
        .setLabel('Entrer accusation')
        .setStyle(ButtonStyle.Primary),
    ),
    rowCancel(ownerId),
  ];
}

function rowCharge(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:enter_charge:${ownerId}`)
        .setLabel('Entrer chef dÔÇÖaccusation')
        .setStyle(ButtonStyle.Primary),
    ),
    rowCancel(ownerId),
  ];
}

function rowConfirm(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal:confirm:${ownerId}`)
        .setLabel('Valider')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`tribunal:cancel:${ownerId}`)
        .setLabel('Annuler')
        .setStyle(ButtonStyle.Secondary),
    )
  ];
}

function caseButtons(caseId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tribunal_case:judge_take:${caseId}`)
        .setLabel('Juge: prendre le dossier')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`tribunal_case:accused_lawyer_pick:${caseId}`)
        .setLabel("Accus├®: choisir l'avocat")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tribunal_case:close:${caseId}`)
        .setLabel('Cl├┤turer')
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
  const byId = cfg.categoryId ? guild.channels.cache.get(cfg.categoryId) : null;
  if (byId && byId.type === ChannelType.GuildCategory) return byId;

  const existing = guild.channels.cache.find(
    ch => ch.type === ChannelType.GuildCategory && /tribunal|proc[e├¿]s|justice/i.test(ch.name || '')
  );
  if (existing) {
    await storage.updateTribunalConfig(gid, { categoryId: existing.id });
    return existing;
  }

  const created = await guild.channels.create({
    name: 'ÔÜû´©Å TRIBUNAL',
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

async function buildStaffRoleOverwrites(guild) {
  // Try to allow staff roles (moderation/admin) to view the case channel.
  const roles = Array.from(guild.roles.cache.values());
  const staffRoles = roles.filter(r => {
    if (!r || r.managed) return false;
    if (r.id === guild.id) return false; // @everyone
    const p = r.permissions;
    return p?.has(PermissionFlagsBits.Administrator) || p?.has(PermissionFlagsBits.ModerateMembers);
  });
  // Limit to avoid hitting overwrite limits.
  return staffRoles.slice(0, 20).map(r => ({
    id: r.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
    ],
  }));
}

function caseEmbedFromRecord(rec) {
  return new EmbedBuilder()
    .setColor(0x5e35b1)
    .setTitle('ÔÜû´©Å Proc├¿s ouvert')
    .setDescription('Un juge doit prendre le dossier, puis lÔÇÖaccus├® peut choisir un avocat.')
    .addFields(
      { name: 'Plaignant', value: rec.plaintiffId ? `<@${rec.plaintiffId}>` : 'ÔÇö', inline: true },
      { name: 'Accus├®', value: rec.accusedId ? `<@${rec.accusedId}>` : 'ÔÇö', inline: true },
      { name: 'Juge', value: rec.judgeId ? `<@${rec.judgeId}>` : 'ÔÅ│ En attente', inline: true },
      { name: 'Avocat (plaignant)', value: rec.plaintiffLawyerId ? `<@${rec.plaintiffLawyerId}>` : 'Aucun', inline: true },
      { name: 'Avocat (accus├®)', value: rec.accusedLawyerId ? `<@${rec.accusedLawyerId}>` : 'ÔÅ│ ├Ç choisir', inline: true },
      { name: 'Chef dÔÇÖaccusation', value: rec.charge ? String(rec.charge).slice(0, 1024) : 'ÔÇö', inline: false },
      { name: 'Statut', value: rec.status || 'open', inline: true },
    )
    .setFooter({ text: `BAG ÔÇó Tribunal ÔÇó Dossier ${rec.id}` })
    .setTimestamp(new Date(rec.createdAt || Date.now()));
}

function ensureOwner(interaction, ownerId) {
  if (interaction.user.id !== ownerId) {
    // Do not leak flow state to others.
    try { interaction.reply({ content: 'Ôøö Ce menu ne vous appartient pas.', ephemeral: true }); } catch (_) {}
    return false;
  }
  return true;
}

module.exports = {
  name: 'tribunal',

  data: new SlashCommandBuilder()
    .setName('tribunal')
    .setDescription('ÔÜû´©Å Ouvrir un dossier au tribunal')
    .setDMPermission(false),

  async execute(interaction) {
    const ownerId = interaction.user.id;
    upsertSession(ownerId, { step: 'accused', accusedId: null, lawyerId: null, charge: '' });
    const embed = buildEmbed('accused', getSession(ownerId) || {});
    return interaction.reply({ embeds: [embed], components: rowAccused(ownerId), ephemeral: true });
  },

  async handleInteraction(interaction) {
    try {
      // Case channel interactions (judge/lawyer/close)
      if (typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal_case:')) {
        const parts = interaction.customId.split(':');
        const action = parts[1];
        const caseId = parts[2];
        const guild = interaction.guild;
        if (!guild || !caseId) return true;

        const rec = await storage.getTribunalCase(guild.id, caseId);
        if (!rec) {
          try {
            if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'ÔØî Dossier introuvable (peut-├¬tre expir├®).', ephemeral: true });
            else await interaction.followUp({ content: 'ÔØî Dossier introuvable (peut-├¬tre expir├®).', ephemeral: true });
          } catch (_) {}
          return true;
        }

        if (interaction.isButton()) {
          if (action === 'judge_take') {
            try { await interaction.deferUpdate(); } catch (_) {}
            const member = interaction.member;
            if (!canActAsJudge(member)) {
              try { await interaction.followUp({ content: 'Ôøö R├®serv├® au staff (juge).', ephemeral: true }); } catch (_) {}
              return true;
            }
            const updated = await storage.upsertTribunalCase(guild.id, caseId, { judgeId: interaction.user.id, status: 'in_progress' });
            // Update panel message if possible
            try {
              const ch = guild.channels.cache.get(updated.channelId) || await guild.channels.fetch(updated.channelId).catch(() => null);
              const msg = ch && updated.panelMessageId ? await ch.messages.fetch(updated.panelMessageId).catch(() => null) : null;
              if (msg) await msg.edit({ embeds: [caseEmbedFromRecord(updated)], components: caseButtons(caseId) }).catch(() => {});
            } catch (_) {}
            return true;
          }

          if (action === 'accused_lawyer_pick') {
            // Only accused can pick their lawyer
            if (interaction.user.id !== String(rec.accusedId)) {
              try { await interaction.reply({ content: "Ôøö Seul l'accus├® peut choisir son avocat.", ephemeral: true }); } catch (_) {}
              return true;
            }
            try { await interaction.reply({ content: "Choisis ton avocat :", components: [new ActionRowBuilder().addComponents(new UserSelectMenuBuilder().setCustomId(`tribunal_case:accused_lawyer_select:${caseId}`).setPlaceholder("S├®lectionner l'avocatÔÇª").setMinValues(1).setMaxValues(1))], ephemeral: true }); } catch (_) {}
            return true;
          }

          if (action === 'close') {
            try { await interaction.deferUpdate(); } catch (_) {}
            const member = interaction.member;
            const isJudgeUser = rec.judgeId && interaction.user.id === String(rec.judgeId);
            if (!(isJudgeUser || isAdmin(member))) {
              try { await interaction.followUp({ content: 'Ôøö Seul le juge (ou un admin) peut cl├┤turer.', ephemeral: true }); } catch (_) {}
              return true;
            }
            const updated = await storage.upsertTribunalCase(guild.id, caseId, { status: 'closed', closedAt: Date.now() });
            try {
              const ch = guild.channels.cache.get(updated.channelId) || await guild.channels.fetch(updated.channelId).catch(() => null);
              const msg = ch && updated.panelMessageId ? await ch.messages.fetch(updated.panelMessageId).catch(() => null) : null;
              if (msg) await msg.edit({ embeds: [caseEmbedFromRecord(updated)], components: [] }).catch(() => {});
              if (ch) {
                await ch.send({ content: `Ô£à Dossier cl├┤tur├® par <@${interaction.user.id}>.` }).catch(() => {});
                // Ensure channel is age-restricted
                try { await ch.setNSFW?.(true); } catch (_) {}
                // Lock the channel: keep visible, but prevent everyone from writing.
                await ch.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: false, AddReactions: false }).catch(() => {});
                await ch.setName(`cloture-${String(ch.name || 'proces').replace(/^cloture-/, '').slice(0, 80)}`.slice(0, 90)).catch(() => {});
              }
            } catch (_) {}
            return true;
          }
        }

        if (interaction.isUserSelectMenu && interaction.isUserSelectMenu() && action === 'accused_lawyer_select') {
          const picked = interaction.values?.[0];
          if (!picked) return true;
          if (interaction.user.id !== String(rec.accusedId)) {
            try { await interaction.reply({ content: "Ôøö Seul l'accus├® peut choisir son avocat.", ephemeral: true }); } catch (_) {}
            return true;
          }
          try { await interaction.deferUpdate(); } catch (_) {}
          const updated = await storage.upsertTribunalCase(guild.id, caseId, { accusedLawyerId: String(picked) });
          try {
            const ch = guild.channels.cache.get(updated.channelId) || await guild.channels.fetch(updated.channelId).catch(() => null);
            const msg = ch && updated.panelMessageId ? await ch.messages.fetch(updated.panelMessageId).catch(() => null) : null;
            if (msg) await msg.edit({ embeds: [caseEmbedFromRecord(updated)], components: caseButtons(caseId) }).catch(() => {});
            if (ch) {
              // Grant access to picked lawyer
              await ch.permissionOverwrites.edit(picked, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});
              await ch.send({ content: `­ƒæ®ÔÇìÔÜû´©Å Avocat de l'accus├® choisi: <@${picked}>` }).catch(() => {});
            }
          } catch (_) {}
          try { await interaction.followUp({ content: `Ô£à Avocat s├®lectionn├®: <@${picked}>`, ephemeral: true }); } catch (_) {}
          return true;
        }
      }

      // Buttons
      if (interaction.isButton() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:')) {
        const [, action, ownerId] = interaction.customId.split(':');
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;

        if (action === 'cancel') {
          try { await interaction.deferUpdate(); } catch (_) {}
          sessions.delete(ownerId);
          try { await interaction.editReply({ content: 'Ô£à Tribunal annul├®.', embeds: [], components: [] }); } catch (_) {}
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
            .setTitle('Chef dÔÇÖaccusation');
          const input = new TextInputBuilder()
            .setCustomId('charge')
            .setLabel('Chef dÔÇÖaccusation')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(900)
            .setPlaceholder('Ex: Vol de cookies, spam, trahisonÔÇª');
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
          return true;
        }

        if (action === 'confirm') {
          // Ack immediately to avoid "application did not respond"
          try { await interaction.deferUpdate(); } catch (_) {}
          const s = getSession(ownerId);
          if (!s || !s.accusedId) {
            try { await interaction.editReply({ content: 'ÔØî Session expir├®e. Relance `/tribunal`.', embeds: [], components: [] }); } catch (_) {}
            return true;
          }
          const guild = interaction.guild;
          if (!guild) {
            try { await interaction.editReply({ content: 'ÔØî Impossible (pas de serveur).', embeds: [], components: [] }); } catch (_) {}
            return true;
          }

          // Create case record (persisted)
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

          // Create channel under tribunal category
          const category = await getOrCreateTribunalCategory(guild, storage);
          const accusedMember = await guild.members.fetch(record.accusedId).catch(() => null);
          const accusedName = accusedMember?.displayName || accusedMember?.user?.username || 'accuse';
          const chanName = `proces-${slugifyChannelName(accusedName)}`.slice(0, 90);

          // Public case channel: visible & writable by everyone.
          // Keep minimal overwrites (only ensure bot can manage).
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
            topic: `Dossier tribunal ${caseId} ÔÇó Accus├®=${record.accusedId} ÔÇó Plaignant=${record.plaintiffId}`,
            permissionOverwrites: overwrites,
            nsfw: true, // soumis ├á l'├óge
          });

          await storage.upsertTribunalCase(guild.id, caseId, { channelId: caseChannel.id });

          const panelEmbed = caseEmbedFromRecord(record);
          const content = `ÔÜû´©Å **Proc├¿s ouvert** ÔÇö ${caseChannel}\nPlaignant: <@${record.plaintiffId}> ÔÇó Accus├®: <@${record.accusedId}>`;
          const panelMsg = await caseChannel.send({ content, embeds: [panelEmbed], components: caseButtons(caseId) }).catch(() => null);
          if (panelMsg?.id) {
            await storage.upsertTribunalCase(guild.id, caseId, { panelMessageId: panelMsg.id });
          }

          sessions.delete(ownerId);
          try {
            await interaction.editReply({
              content: `Ô£à Dossier envoy├® au tribunal.\nSalon cr├®├®: ${caseChannel}`,
              embeds: [],
              components: [],
            });
          } catch (_) {}
          return true;
        }

        return false;
      }

      // Select menus
      if (interaction.isUserSelectMenu() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:')) {
        const [, kind, ownerId] = interaction.customId.split(':');
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;
        const picked = interaction.values?.[0];
        if (!picked) return true;

        if (kind === 'accused') {
          try { await interaction.deferUpdate(); } catch (_) {}
          const s = upsertSession(ownerId, { accusedId: picked, step: 'lawyer' });
          const embed = buildEmbed('lawyer', s);
          try { await interaction.editReply({ embeds: [embed], components: rowLawyer(ownerId) }); } catch (_) {}
          return true;
        }

        if (kind === 'lawyer') {
          try { await interaction.deferUpdate(); } catch (_) {}
          const s = upsertSession(ownerId, { lawyerId: picked, step: 'charge' });
          const embed = buildEmbed('charge', s);
          try { await interaction.editReply({ embeds: [embed], components: rowCharge(ownerId) }); } catch (_) {}
          return true;
        }

        return false;
      }

      // Modal submit
      if (interaction.isModalSubmit() && typeof interaction.customId === 'string' && interaction.customId.startsWith('tribunal:charge_modal:')) {
        const ownerId = interaction.customId.split(':')[2];
        if (!ownerId || !ensureOwner(interaction, ownerId)) return true;
        const charge = String(interaction.fields.getTextInputValue('charge') || '').trim();
        const s = upsertSession(ownerId, { charge, step: 'confirm' });
        const embed = buildEmbed('confirm', s);
        try { await interaction.reply({ embeds: [embed], components: rowConfirm(ownerId), ephemeral: true }); } catch (_) {}
        return true;
      }

      return false;
    } catch (e) {
      try {
        const msg = `ÔØî Une erreur est survenue : ${e?.message || String(e)}`;
        if (interaction.deferred || interaction.replied) await interaction.followUp({ content: msg, ephemeral: true });
        else await interaction.reply({ content: msg, ephemeral: true });
      } catch (_) {}
      return true;
    }
  }
};

