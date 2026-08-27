const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { db, getEconomy, updateEconomy, getCasinoConfig } = require('../../database/db');

module.exports = {
  data: new SlashCommandBuilder().setContexts([0, 1, 2]).setIntegrationTypes([0, 1])
    .setName('combat-coq')
    .setDescription('Organiser un combat de coqs acharné dans l\'arène')
    .setDMPermission(true)
    .addIntegerOption(option =>
      option.setName('mise')
        .setDescription('Montant de pièces à miser sur votre coq')
        .setRequired(true)
        .setMinValue(1)
    )
    .addUserOption(option =>
      option.setName('adversaire')
        .setDescription('Un autre membre possédant un Coq (optionnel)')
        .setRequired(false)
    ),

  async execute(interaction) {
    const bet = interaction.options.getInteger('mise');
    const opponent = interaction.options.getUser('adversaire');
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;

    if (!guildId) {
      return interaction.reply({ content: '❌ Les combats de coqs sont uniquement disponibles sur un serveur.', ephemeral: true });
    }

    const config = getCasinoConfig(guildId, 'coq');
    if (!config.is_enabled) {
      return interaction.reply({ content: '❌ Les combats de coqs ont été désactivés sur ce serveur.', ephemeral: true });
    }

    if (bet < config.min_bet) {
      return interaction.reply({ content: `❌ La mise minimale pour un combat de coqs est de **${config.min_bet} pièces**.`, ephemeral: true });
    }

    if (bet > config.max_bet) {
      return interaction.reply({ content: `❌ La mise maximale pour un combat de coqs est de **${config.max_bet} pièces**.`, ephemeral: true });
    }

    // Vérification de la possession d'un Coq dans l'inventaire
    const userCoq = db.prepare("SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%Coq%'").get(guildId, userId);
    if (!userCoq || userCoq.quantity <= 0) {
      const shopItem = db.prepare("SELECT price FROM shop WHERE guild_id = ? AND item_name LIKE '%Coq%'").get(guildId);
      const priceStr = shopItem ? ` (${shopItem.price} pièces)` : '';
      return interaction.reply({
        content: `❌ **Vous ne possédez aucun Coq de Combat !**\n🛒 Rendez-vous dans la **\`/boutique\`** pour en acheter un${priceStr} avant de pouvoir entrer dans l'arène !`,
        ephemeral: true
      });
    }

    const economy = getEconomy(guildId, userId);
    if (economy.wallet < bet) {
      return interaction.reply({ content: `❌ Vous n'avez pas assez de pièces en poche pour miser ! Solde : **${economy.wallet} pièces**.`, ephemeral: true });
    }

    if (opponent) {
      if (opponent.id === userId) {
        return interaction.reply({ content: '❌ Vous ne pouvez pas combattre contre vous-même !', ephemeral: true });
      }
      if (opponent.bot) {
        return interaction.reply({ content: '❌ Les bots ne possèdent pas de coqs de combat !', ephemeral: true });
      }

      const oppCoq = db.prepare("SELECT quantity FROM inventory WHERE guild_id = ? AND user_id = ? AND item_name LIKE '%Coq%'").get(guildId, opponent.id);
      if (!oppCoq || oppCoq.quantity <= 0) {
        return interaction.reply({ content: `❌ <@${opponent.id}> ne possède aucun Coq de Combat dans son inventaire !`, ephemeral: true });
      }

      const oppEconomy = getEconomy(guildId, opponent.id);
      if (oppEconomy.wallet < bet) {
        return interaction.reply({ content: `❌ <@${opponent.id}> n'a pas assez de pièces en poche pour suivre votre mise de **${bet} pièces**.`, ephemeral: true });
      }
    }

    await interaction.deferReply();

    // Déduire la mise du joueur principal
    updateEconomy(guildId, userId, { wallet: economy.wallet - bet });
    if (opponent) {
      const oppEconomy = getEconomy(guildId, opponent.id);
      updateEconomy(guildId, opponent.id, { wallet: oppEconomy.wallet - bet });
    }

    // PHASE 1: CHOIX DE LA RACE DU CHAMPION
    const breedRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`coq_b_gaulois_${userId}`).setLabel('🔴 Coq Gaulois (Attaque & Critiques)').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`coq_b_shamo_${userId}`).setLabel('🔵 Shamo Japonais (Esquive & Vitesse)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`coq_b_asil_${userId}`).setLabel('🟡 Asil d\'Inde (Résistance & PV)').setStyle(ButtonStyle.Success)
    );

    const initEmbed = new EmbedBuilder()
      .setTitle('🐓 Arène de Combat de Coq - Choix de la Race')
      .setDescription(
        '**Bienvenue dans le Ring d\'Arène !** Sélectionnez la race de votre champion :\n\n' +
        '🔴 **Coq Gaulois de Combat** : Puissance de frappe brute et ergots acérés (+35% de coups critiques).\n' +
        '🔵 **Shamo Japonais** : Maître de l\'esquive et de la contre-attaque rapide (+30% d\'esquive).\n' +
        '🟡 **Asil d\'Inde (Malais)** : Squelette massif et peau renforcée (130 HP de départ).'
      )
      .setColor(0xd35400)
      .addFields({ name: '💰 Mise d\'entrée', value: `${bet} pièces`, inline: true });

    const msg = await interaction.editReply({ embeds: [initEmbed], components: [breedRow] });
    const breedCollector = msg.createMessageComponentCollector({ time: 30000 });

    breedCollector.on('collect', async bCtx => {
      if (bCtx.user.id !== userId) {
        return bCtx.reply({ content: '❌ Seul le dresseur d\'origine peut choisir son coq.', ephemeral: true });
      }
      breedCollector.stop();

      let breedName = '🔴 Coq Gaulois de Combat';
      let baseHp = 100;
      let critBonus = 0.35;
      let dodgeBonus = 0.10;

      if (bCtx.customId.includes('shamo')) {
        breedName = '🔵 Shamo Japonais';
        dodgeBonus = 0.30;
        critBonus = 0.15;
      } else if (bCtx.customId.includes('asil')) {
        breedName = '🟡 Asil d\'Inde';
        baseHp = 130;
        critBonus = 0.15;
      }

      await promptEquipmentPhase(bCtx, breedName, baseHp, critBonus, dodgeBonus, bet);
    });

    async function promptEquipmentPhase(iCtx, breedName, baseHp, critBonus, dodgeBonus, currentBet) {
      const gearRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`coq_g_steel_${userId}`).setLabel('⚔️ Éperons en Acier (+Dégâts)').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`coq_g_armor_${userId}`).setLabel('🛡️ Harnais en Cuir (-Dégâts Subis)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`coq_g_tonic_${userId}`).setLabel('🧪 Potion de Fureur (+15 HP Max)').setStyle(ButtonStyle.Success)
      );

      const gearEmbed = new EmbedBuilder()
        .setTitle(`🐓 Préparation de ${breedName}`)
        .setDescription(
          '**Équipez votre coq avant le coup d\'envoi dans le ring :**\n\n' +
          '⚔️ **Éperons en Acier Tranchants** : Multiplie les dégâts des coups d\'éperon.\n' +
          '🛡️ **Harnais en Cuir Renforcé** : Réduit de 25% les dégâts infligés par l\'adversaire.\n' +
          '🧪 **Potion de Fureur & Vigueur** : Augmente la santé maximale de +15 HP.'
        )
        .setColor(0xd35400)
        .addFields({ name: '🐓 Champion', value: breedName, inline: true });

      let gearMsg = await iCtx.update({ embeds: [gearEmbed], components: [gearRow], fetchReply: true });
      const gearCollector = gearMsg.createMessageComponentCollector({ time: 30000 });

      gearCollector.on('collect', async gCtx => {
        if (gCtx.user.id !== userId) {
          return gCtx.reply({ content: '❌ Seul le dresseur d\'origine peut équiper son coq.', ephemeral: true });
        }
        gearCollector.stop();

        let gearName = '⚔️ Éperons en Acier';
        let dmgMult = 1.25;
        let dmgReduction = 0;
        let playerMaxHp = baseHp;

        if (gCtx.customId.includes('armor')) {
          gearName = '🛡️ Harnais en Cuir';
          dmgReduction = 0.25;
          dmgMult = 1.0;
        } else if (gCtx.customId.includes('tonic')) {
          gearName = '🧪 Potion de Fureur';
          playerMaxHp += 15;
          dmgMult = 1.1;
        }

        await startRealCockfightArena(gCtx, breedName, gearName, playerMaxHp, critBonus, dodgeBonus, dmgMult, dmgReduction, currentBet);
      });
    }

    async function startRealCockfightArena(iCtx, breedName, gearName, playerMaxHp, critBonus, dodgeBonus, dmgMult, dmgReduction, currentBet) {
      let playerHp = playerMaxHp;
      let enemyHp = 100;
      let enemyName = opponent ? `🦅 Coq de ${opponent.displayName || opponent.username}` : '🦅 Coq Adverse de l\'Arène';
      let roundNum = 1;
      let logHistory = [`🏁 **Ronde 1 !** ${breedName} armé de ${gearName} pénètre dans l'arène en poussant un retentissant chant de guerre !`];

      const getHealthBar = (current, max) => {
        const pct = Math.max(0, Math.min(1, current / max));
        const filled = Math.round(pct * 10);
        const empty = 10 - filled;
        let statusStr = '🟢 (En pleine forme)';
        if (pct < 0.3) statusStr = '🔴 (🩸 En sang !)';
        else if (pct < 0.6) statusStr = '🟠 (🪶 Blessé)';

        return `\`[${'█'.repeat(filled)}${'░'.repeat(empty)}]\` **${current}/${max} HP** ${statusStr}`;
      };

      const getBattleButtons = (isRageAvailable = false) => {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`coq_act_bec_${userId}`).setLabel('⚔️ Coup de Bec').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId(`coq_act_eperon_${userId}`).setLabel('⚡ Coup d\'Éperon').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId(`coq_act_parade_${userId}`).setLabel('🛡️ Parade & Contre').setStyle(ButtonStyle.Success)
        );

        if (isRageAvailable) {
          row.addComponents(
            new ButtonBuilder().setCustomId(`coq_act_rage_${userId}`).setLabel('🔥 Envol de Fureur (Ultime)').setStyle(ButtonStyle.Danger)
          );
        }
        return [row];
      };

      const buildBattleEmbed = () => {
        const isRage = (playerHp / playerMaxHp) < 0.5;
        const embed = new EmbedBuilder()
          .setTitle(`🐓 Arène de Combat de Coqs - Tour ${roundNum}`)
          .setDescription(
            `**${breedName} (Vous - ${gearName}) :**\n${getHealthBar(playerHp, playerMaxHp)}\n\n` +
            `**${enemyName} :**\n${getHealthBar(enemyHp, 100)}\n\n` +
            `📋 **Journal d'Arène :**\n${logHistory.slice(-4).join('\n')}`
          )
          .setColor(isRage ? 0xe74c3c : 0xd35400)
          .addFields({ name: '💰 En Jeu', value: `**${currentBet} pièces**`, inline: true })
          .setFooter({ text: isRage ? '🔥 Votre coq est blessé ! L\'Envol de Fureur est disponible !' : 'Choisissez la prochaine attaque de votre champion.' });
        return embed;
      };

      const isRageInit = (playerHp / playerMaxHp) < 0.5;
      let battleMsg = await iCtx.update({ embeds: [buildBattleEmbed()], components: getBattleButtons(isRageInit), fetchReply: true });
      const battleCollector = battleMsg.createMessageComponentCollector({ time: 60000 });

      battleCollector.on('collect', async bCtx => {
        if (bCtx.user.id !== userId) {
          return bCtx.reply({ content: '❌ Seul le dresseur d\'origine peut donner des ordres à son coq.', ephemeral: true });
        }

        roundNum++;
        let pDmg = 0;
        let eDmg = 0;
        let actionLog = `🥊 **Tour ${roundNum - 1} :** `;

        if (bCtx.customId.includes('bec')) {
          pDmg = Math.floor((Math.random() * 11 + 16) * dmgMult);
          if (Math.random() < critBonus) {
            pDmg = Math.floor(pDmg * 1.6);
            actionLog += `💥 **Coup de bec précis au visage !** (-${pDmg} HP) !`;
          } else {
            actionLog += `⚔️ Coup de bec rapide (-${pDmg} HP).`;
          }
        } else if (bCtx.customId.includes('eperon')) {
          if (Math.random() < 0.22) {
            actionLog += `💨 Tentative de coup d'éperon sautée qui manque la cible !`;
          } else {
            pDmg = Math.floor((Math.random() * 21 + 28) * dmgMult);
            actionLog += `⚡ **Volée d'éperons sanglante !** (-${pDmg} HP) ! 🪶`;
          }
        } else if (bCtx.customId.includes('parade')) {
          actionLog += `🛡️ Position défensive adoptée.`;
        } else if (bCtx.customId.includes('rage')) {
          pDmg = Math.floor((Math.random() * 25 + 38) * dmgMult);
          actionLog += `🔥 **ENVOL DE FUREUR !** Votre coq s'élance dans les airs et terrasse l'adversaire (-${pDmg} HP) ! 🩸`;
        }

        enemyHp = Math.max(0, enemyHp - pDmg);

        if (enemyHp <= 0) {
          battleCollector.stop();
          const mult = config.payout_multiplier || 2.0;
          const totalPot = opponent ? currentBet * 2 : Math.floor(currentBet * mult);
          const eco = getEconomy(guildId, userId);
          updateEconomy(guildId, userId, { wallet: eco.wallet + totalPot });

          const victoryEmbed = new EmbedBuilder()
            .setTitle('🏆 KO SPECTACULAIRE ! Votre Coq est le Roi de l\'Arène !')
            .setDescription(
              `**${breedName} :** ${getHealthBar(playerHp, playerMaxHp)}\n` +
              `**${enemyName} :** \`[░░░░░░░░░░]\` **0/100 HP** 💀 KO !\n\n` +
              `🎉 Le coq adverse s'effondre sur le tapis dans une nuée de plumes ! Vous remportez le grand prix d'arène !`
            )
            .setColor(0x2ecc71)
            .addFields(
              { name: '💰 Mise', value: `${currentBet} pièces`, inline: true },
              { name: '🎉 Gains Totaux', value: `**+${totalPot} pièces**`, inline: true }
            )
            .setTimestamp();

          return bCtx.update({ embeds: [victoryEmbed], components: [] });
        }

        if (Math.random() < dodgeBonus) {
          actionLog += `\n🌀 **Esquive fabuleuse !** Votre ${breedName} évite le coup ennemi avec agilité !`;
        } else {
          eDmg = Math.floor((Math.random() * 16 + 14) * (1 - dmgReduction));
          if (bCtx.customId.includes('parade')) {
            eDmg = Math.floor(eDmg * 0.25);
            const counterDmg = Math.floor(Math.random() * 12 + 12);
            enemyHp = Math.max(0, enemyHp - counterDmg);
            actionLog += `\n🛡️ Parade parfaite ! Dégâts subis réduits (-${eDmg} HP) et riposte cinglante (-${counterDmg} HP) !`;
          } else {
            actionLog += `\n🦅 Le Coq Adverse donne un coup d'ergot violent (-${eDmg} HP) !`;
          }
        }

        playerHp = Math.max(0, playerHp - eDmg);
        logHistory.push(actionLog);

        if (playerHp <= 0) {
          battleCollector.stop();

          if (opponent) {
            const oppEco = getEconomy(guildId, opponent.id);
            const totalPot = currentBet * 2;
            updateEconomy(guildId, opponent.id, { wallet: oppEco.wallet + totalPot });
          }

          const defeatEmbed = new EmbedBuilder()
            .setTitle('❌ KO DÉFAITE... Votre Coq s\'est effondré dans l\'arène.')
            .setDescription(
              `**${breedName} :** \`[░░░░░░░░░░]\` **0/${playerMaxHp} HP** 💀 KO !\n` +
              `**${enemyName} :** ${getHealthBar(enemyHp, 100)}\n\n` +
              (opponent ? `👑 <@${opponent.id}> remporte la mise globale de **+${currentBet * 2} pièces** !` : `💀 Votre champion a succombé aux blessures. Vous perdez votre mise.`)
            )
            .setColor(0xe74c3c)
            .addFields({ name: '💰 Perte', value: `-${currentBet} pièces`, inline: true })
            .setTimestamp();

          return bCtx.update({ embeds: [defeatEmbed], components: [] });
        }

        const isRageNext = (playerHp / playerMaxHp) < 0.5;
        await bCtx.update({ embeds: [buildBattleEmbed()], components: getBattleButtons(isRageNext) });
      });

      battleCollector.on('end', (collected, reason) => {
        if (reason === 'time') {
          battleMsg.edit({ components: [] }).catch(() => null);
        }
      });
    }
  }
};
