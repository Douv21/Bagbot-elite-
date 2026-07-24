const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder
} = require('discord.js');

const { renderGameBoardCanvas, renderPlayerHandCanvas, isCardPlayable, COLOR_NAMES, COLOR_EMOJIS } = require('../../utils/unoCanvas');
const { UnoGame } = require('../../utils/unoGame');

// Stockage des parties actives par ID de salon (channelId => UnoGame)
const activeGames = new Map();

/**
 * Crée l'embed et les boutons de la salle d'attente (Lobby)
 */
function createLobbyMessage(game) {
  const embed = new EmbedBuilder()
    .setTitle('🎮 UNO — Salle d\'attente')
    .setDescription(
      `Bienvenue dans la salle d'attente du UNO !\n\n` +
      `**Mode :** ${game.mode === 'solo' ? '🤖 Mode Solo (VS Bot)' : '👥 Multi-Joueurs'}\n` +
      `**Variante :** ${game.variant === 'stack' ? '⚡ Cumulatif (+2 / +4)' : game.variant === '7-0' ? '🔄 Mode 7-0' : '🎲 Classique'}\n\n` +
      `**Joueurs prêts (${game.players.length}/10) :**\n` +
      game.players.map((p, i) => `${i + 1}. <@${p.id}> ${p.isBot ? '🤖 (Bot)' : ''}`).join('\n')
    )
    .setColor('#9B59B6')
    .setFooter({ text: 'Cliquez sur Rejoindre pour participer !' })
    .setTimestamp();

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uno_lobby_join_${game.channelId}`)
      .setLabel('Rejoindre')
      .setStyle(ButtonStyle.Success)
      .setEmoji('➕'),
    new ButtonBuilder()
      .setCustomId(`uno_lobby_leave_${game.channelId}`)
      .setLabel('Quitter')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('➖'),
    new ButtonBuilder()
      .setCustomId(`uno_lobby_addbot_${game.channelId}`)
      .setLabel('Ajouter Bot')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🤖'),
    new ButtonBuilder()
      .setCustomId(`uno_lobby_start_${game.channelId}`)
      .setLabel('Lancer !')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setCustomId(`uno_lobby_cancel_${game.channelId}`)
      .setLabel('Annuler')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  return { embeds: [embed], components: [buttons] };
}

/**
 * Génère le message public principal de la partie en cours
 */
function createGameMessage(game) {
  const buffer = renderGameBoardCanvas(game);
  const attachment = new AttachmentBuilder(buffer, { name: 'uno-board.png' });

  const topCard = game.getTopCard();
  const currentPlayer = game.getCurrentPlayer();

  const embed = new EmbedBuilder()
    .setTitle(game.status === 'finished' ? '🏆 UNO — PARTIE TERMINÉE !' : `🎮 UNO — Tour de ${currentPlayer ? currentPlayer.username : ''}`)
    .setDescription(
      `${game.lastActionMessage}\n\n` +
      `**Dernière carte posée :** ${game.getCardDisplay(topCard)}\n\n` +
      `**Joueurs et mains :**\n` +
      game.players.map(p => {
        const isTurn = currentPlayer && p.id === currentPlayer.id;
        const unoBadge = game.unoDeclarations.has(p.id) ? ' 🔴 **UNO !**' : '';
        return `${isTurn ? '▶️ **' : '• '}${p.username}${isTurn ? '**' : ''} : ${p.hand.length} carte${p.hand.length > 1 ? 's' : ''}${unoBadge}`;
      }).join('\n')
    )
    .setImage('attachment://uno-board.png')
    .setColor(game.status === 'finished' ? '#FFD700' : '#8E44AD')
    .setFooter({ text: 'Cliquez sur "🃏 Ma Main" pour ouvrir votre jeu de cartes éphémère !' })
    .setTimestamp();

  if (game.status === 'finished') {
    return { embeds: [embed], files: [attachment], components: [] };
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uno_play_hand_${game.channelId}`)
      .setLabel('Ma Main')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🃏'),
    new ButtonBuilder()
      .setCustomId(`uno_play_draw_${game.channelId}`)
      .setLabel('Piocher')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📥'),
    new ButtonBuilder()
      .setCustomId(`uno_play_calluno_${game.channelId}`)
      .setLabel('DIRE UNO !')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔴'),
    new ButtonBuilder()
      .setCustomId(`uno_play_counteruno_${game.channelId}`)
      .setLabel('CONTRER UNO !')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📢'),
    new ButtonBuilder()
      .setCustomId(`uno_play_quit_${game.channelId}`)
      .setLabel('Quitter')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🚪')
  );

  return { embeds: [embed], files: [attachment], components: [buttons] };
}

/**
 * Génère le panneau éphémère de la main d'un joueur
 */
function createPlayerHandPayload(game, userId) {
  const player = game.players.find(p => p.id === userId);
  if (!player) {
    return { content: '❌ Vous ne participez pas à cette partie.', ephemeral: true };
  }

  const topCard = game.getTopCard();
  const buffer = renderPlayerHandCanvas(player.hand, topCard, game.penaltyStack);
  const attachment = new AttachmentBuilder(buffer, { name: 'uno-hand.png' });

  const isMyTurn = game.getCurrentPlayer() && game.getCurrentPlayer().id === userId;

  const embed = new EmbedBuilder()
    .setTitle(`🃏 Votre Main UNO (${player.hand.length} carte${player.hand.length > 1 ? 's' : ''})`)
    .setDescription(
      isMyTurn
        ? '🎯 **C\'est votre tour de jouer !** Choisissez une carte dans le menu ci-dessous ou piochez.'
        : '⏳ Attendez votre tour pour jouer.'
    )
    .setImage('attachment://uno-hand.png')
    .setColor(isMyTurn ? '#2ECC71' : '#34495E');

  const components = [];

  // Sélecteur de cartes si le joueur a des cartes
  if (player.hand.length > 0) {
    const options = player.hand.map((card, idx) => {
      const playable = isMyTurn && isCardPlayable(card, topCard, game.penaltyStack);
      const colorName = COLOR_NAMES[card.chosenColor || card.color] || card.color;
      let labelText = `#${idx + 1} - ${card.type === 'number' ? `Chiffre ${card.value}` : card.type}`;
      if (card.type === 'skip') labelText = `#${idx + 1} - Passe (Skip)`;
      if (card.type === 'reverse') labelText = `#${idx + 1} - Inversion (Reverse)`;
      if (card.type === 'draw2') labelText = `#${idx + 1} - Plus 2 (+2)`;
      if (card.type === 'wild') labelText = `#${idx + 1} - Joker (Wild)`;
      if (card.type === 'wild_draw4') labelText = `#${idx + 1} - Joker +4`;

      return {
        label: labelText.slice(0, 100),
        description: playable ? `✅ Jouable (${colorName})` : `⛔ Non jouable`,
        value: `card_${idx}`,
        emoji: COLOR_EMOJIS[card.chosenColor || card.color] || '🃏'
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`uno_select_card_${game.channelId}`)
      .setPlaceholder(isMyTurn ? 'Sélectionner une carte à poser...' : 'Pas votre tour...')
      .setDisabled(!isMyTurn)
      .addOptions(options.slice(0, 25)); // Max 25 options Discord

    components.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // Boutons d'action rapide dans le panneau éphémère
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`uno_play_draw_${game.channelId}`)
      .setLabel(game.penaltyStack > 0 ? `Subir +${game.penaltyStack}` : (game.drawnThisTurn ? 'Passer' : 'Piocher'))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📥')
      .setDisabled(!isMyTurn),
    new ButtonBuilder()
      .setCustomId(`uno_play_calluno_${game.channelId}`)
      .setLabel('DIRE UNO !')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔴')
  );

  components.push(actionRow);

  return { embeds: [embed], files: [attachment], components, ephemeral: true };
}

/**
 * Lance automatiquement le tour d'un Bot IA
 */
async function triggerBotTurnIfNeeded(game, channel) {
  if (game.status !== 'in_progress') return;
  const current = game.getCurrentPlayer();
  if (!current || !current.isBot) return;

  setTimeout(async () => {
    if (game.status !== 'in_progress') return;
    const botCurrent = game.getCurrentPlayer();
    if (!botCurrent || !botCurrent.isBot) return;

    game.botPlay();

    // Mettre à jour le message principal du canal
    const msgPayload = createGameMessage(game);
    await channel.send(msgPayload).catch(console.error);

    // Relancer récursivement si le tour suivant est encore au Bot
    if (game.status === 'in_progress' && game.getCurrentPlayer() && game.getCurrentPlayer().isBot) {
      triggerBotTurnIfNeeded(game, channel);
    }
  }, 1400);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uno')
    .setDescription('🎮 Lancer ou rejoindre une partie de UNO interactif')
    .addStringOption(option =>
      option.setName('mode')
        .setDescription('Mode de jeu (Solo VS Bot ou Multi-Joueurs)')
        .setRequired(false)
        .addChoices(
          { name: '🤖 Mode Solo (VS Bot UNO)', value: 'solo' },
          { name: '👥 Mode Multi-Joueurs (Salon Public)', value: 'multi' }
        )
    )
    .addStringOption(option =>
      option.setName('variante')
        .setDescription('Variante de jeu (Cumulatif +2/+4, Classique)')
        .setRequired(false)
        .addChoices(
          { name: '⚡ Cumulatif (+2 / +4)', value: 'stack' },
          { name: '🎲 Classique (Standard)', value: 'classic' },
          { name: '🔄 Mode 7-0 (Échange de main sur 7 / 0)', value: '7-0' }
        )
    ),

  async execute(interaction) {
    const channelId = interaction.channelId;
    const mode = interaction.options.getString('mode') || 'multi';
    const variant = interaction.options.getString('variante') || 'stack';

    // Vérifier si une partie est déjà active dans ce salon
    if (activeGames.has(channelId)) {
      const existing = activeGames.get(channelId);
      if (existing.status === 'lobby') {
        return interaction.reply({
          content: `⚠️ Une salle d'attente UNO est déjà ouverte dans ce salon. Utilisez les boutons ci-dessus pour la rejoindre !`,
          ephemeral: true
        });
      } else if (existing.status === 'in_progress') {
        return interaction.reply({
          content: `⚠️ Une partie de UNO est déjà en cours dans ce salon. Attendez qu'elle se termine !`,
          ephemeral: true
        });
      }
    }

    const game = new UnoGame({
      id: `${channelId}_${Date.now()}`,
      channelId,
      creatorId: interaction.user.id,
      mode,
      variant
    });

    game.addPlayer(interaction.user.id, interaction.user.username);
    activeGames.set(channelId, game);

    // Si mode Solo, lancer directement la partie !
    if (mode === 'solo') {
      game.start();
      const payload = createGameMessage(game);
      await interaction.reply(payload);
      triggerBotTurnIfNeeded(game, interaction.channel);
      return;
    }

    // Mode Multi: afficher le lobby
    const lobbyPayload = createLobbyMessage(game);
    await interaction.reply(lobbyPayload);
  },

  /**
   * Gestionnaire central des boutons, sélecteurs et modaux du jeu UNO
   */
  async handleInteraction(interaction) {
    const customId = interaction.customId;
    if (!customId) return false;

    const channelId = interaction.channelId;
    const game = activeGames.get(channelId);

    if (!game) {
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        try {
          await interaction.reply({ content: '❌ Aucune partie de UNO active dans ce salon.', ephemeral: true });
        } catch (_) {}
      }
      return true;
    }

    // --- 1. BOUTONS LOBBY ---
    if (customId.startsWith('uno_lobby_')) {
      const action = customId.replace(`uno_lobby_`, '').split('_')[0];

      if (action === 'join') {
        const res = game.addPlayer(interaction.user.id, interaction.user.username);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }
        await interaction.update(createLobbyMessage(game));
        return true;
      }

      if (action === 'leave') {
        game.removePlayer(interaction.user.id);
        if (game.players.length === 0) {
          activeGames.delete(channelId);
          await interaction.update({ content: '🚫 Salle d\'attente fermée (plus aucun joueur).', embeds: [], components: [] });
          return true;
        }
        await interaction.update(createLobbyMessage(game));
        return true;
      }

      if (action === 'addbot') {
        const botId = `BOT_${game.players.length + 1}`;
        const botName = `🤖 Bot ${game.players.length + 1}`;
        const res = game.addPlayer(botId, botName, true);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }
        await interaction.update(createLobbyMessage(game));
        return true;
      }

      if (action === 'start') {
        if (interaction.user.id !== game.creatorId) {
          return interaction.reply({ content: '❌ Seul le créateur de la partie peut lancer le jeu.', ephemeral: true });
        }
        const res = game.start();
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }

        const payload = createGameMessage(game);
        await interaction.update(payload);
        triggerBotTurnIfNeeded(game, interaction.channel);
        return true;
      }

      if (action === 'cancel') {
        if (interaction.user.id !== game.creatorId) {
          return interaction.reply({ content: '❌ Seul le créateur peut annuler la partie.', ephemeral: true });
        }
        activeGames.delete(channelId);
        await interaction.update({ content: '🚫 Partie de UNO annulée.', embeds: [], components: [] });
        return true;
      }
    }

    // --- 2. BOUTONS & SELECTEUR EN JEU ---
    if (customId.startsWith('uno_play_') || customId.startsWith('uno_select_')) {
      if (game.status !== 'in_progress') {
        return interaction.reply({ content: '❌ La partie n\'est pas en cours.', ephemeral: true });
      }

      // Voir sa main (Éphémère)
      if (customId.startsWith('uno_play_hand_')) {
        const payload = createPlayerHandPayload(game, interaction.user.id);
        return interaction.reply(payload);
      }

      // Dire UNO !
      if (customId.startsWith('uno_play_calluno_')) {
        const res = game.declareUno(interaction.user.id);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }
        await interaction.deferUpdate().catch(() => {});
        const payload = createGameMessage(game);
        await interaction.message.edit(payload).catch(() => {});
        return true;
      }

      // Contrer UNO !
      if (customId.startsWith('uno_play_counteruno_')) {
        const res = game.counterUno(interaction.user.id);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }
        await interaction.deferUpdate().catch(() => {});
        const payload = createGameMessage(game);
        await interaction.message.edit(payload).catch(() => {});
        return true;
      }

      // Piocher une carte
      if (customId.startsWith('uno_play_draw_')) {
        const res = game.drawCard(interaction.user.id);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }

        await interaction.deferUpdate().catch(() => {});
        const payload = createGameMessage(game);
        await interaction.message.edit(payload).catch(() => {});

        // Proposer la main à jour si éphémère
        triggerBotTurnIfNeeded(game, interaction.channel);
        return true;
      }

      // Quitter la partie
      if (customId.startsWith('uno_play_quit_')) {
        game.removePlayer(interaction.user.id);
        await interaction.reply({ content: '🚪 Vous avez quitté la partie de UNO.', ephemeral: true });

        if (game.status === 'finished') {
          activeGames.delete(channelId);
        }
        const payload = createGameMessage(game);
        await interaction.channel.send(payload).catch(() => {});
        return true;
      }

      // Poser une carte depuis le menu déroulant
      if (customId.startsWith('uno_select_card_')) {
        const selectedValue = interaction.values[0];
        const cardIndex = parseInt(selectedValue.replace('card_', ''));

        const player = game.getCurrentPlayer();
        if (!player || player.id !== interaction.user.id) {
          return interaction.reply({ content: "❌ Ce n'est pas votre tour !", ephemeral: true });
        }

        const card = player.hand[cardIndex];
        if (!card) {
          return interaction.reply({ content: "❌ Carte introuvable.", ephemeral: true });
        }

        // Si la carte est un Joker (Wild / Wild +4), afficher le choix de couleur
        if (card.type === 'wild' || card.type === 'wild_draw4') {
          const colorRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`uno_color_red_${cardIndex}`).setLabel('Rouge').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
            new ButtonBuilder().setCustomId(`uno_color_blue_${cardIndex}`).setLabel('Bleu').setStyle(ButtonStyle.Primary).setEmoji('💙'),
            new ButtonBuilder().setCustomId(`uno_color_green_${cardIndex}`).setLabel('Vert').setStyle(ButtonStyle.Success).setEmoji('🟢'),
            new ButtonBuilder().setCustomId(`uno_color_yellow_${cardIndex}`).setLabel('Jaune').setStyle(ButtonStyle.Secondary).setEmoji('🟡')
          );

          return interaction.update({
            content: '🎨 **Choisissez la couleur du Joker :**',
            embeds: [],
            components: [colorRow]
          });
        }

        // Jouer la carte normale
        const res = game.playCard(interaction.user.id, cardIndex);
        if (!res.success) {
          return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
        }

        // Mettre à jour le panneau éphémère du joueur et la partie publique
        await interaction.update({ content: '✅ Carte posée avec succès !', embeds: [], components: [] });

        if (game.status === 'finished') {
          activeGames.delete(channelId);
        }

        const publicPayload = createGameMessage(game);
        await interaction.channel.send(publicPayload).catch(() => {});
        triggerBotTurnIfNeeded(game, interaction.channel);
        return true;
      }
    }

    // --- 3. CHOIX DE COULEUR POUR JOKER ---
    if (customId.startsWith('uno_color_')) {
      const parts = customId.split('_');
      const chosenColor = parts[2]; // red, blue, green, yellow
      const cardIndex = parseInt(parts[3]);

      const res = game.playCard(interaction.user.id, cardIndex, chosenColor);
      if (!res.success) {
        return interaction.reply({ content: `❌ ${res.error}`, ephemeral: true });
      }

      await interaction.update({ content: `✅ Joker posé ! Couleur choisie : **${COLOR_NAMES[chosenColor]}**`, embeds: [], components: [] });

      if (game.status === 'finished') {
        activeGames.delete(channelId);
      }

      const publicPayload = createGameMessage(game);
      await interaction.channel.send(publicPayload).catch(() => {});
      triggerBotTurnIfNeeded(game, interaction.channel);
      return true;
    }

    return false;
  }
};
