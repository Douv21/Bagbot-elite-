// script.js
window.showToast = function(message, isError = false) {
  let tEl = document.getElementById('toast');
  if (!tEl) {
    tEl = document.createElement('div');
    tEl.id = 'toast';
    tEl.className = 'toast glass';
    document.body.appendChild(tEl);
  }
  tEl.textContent = message;
  tEl.style.display = 'block';
  tEl.style.position = 'fixed';
  tEl.style.bottom = '25px';
  tEl.style.right = '25px';
  tEl.style.zIndex = '99999';
  tEl.style.padding = '14px 24px';
  tEl.style.borderRadius = '10px';
  tEl.style.fontWeight = '600';
  tEl.style.fontSize = '0.95rem';
  tEl.style.background = isError ? 'rgba(231, 76, 60, 0.95)' : 'rgba(46, 204, 113, 0.95)';
  tEl.style.color = '#ffffff';
  tEl.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
  tEl.style.transition = 'all 0.3s ease';

  tEl.classList.add('show');
  setTimeout(() => {
    tEl.classList.remove('show');
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginContainer = document.getElementById('login-container');
  const dashboardContainer = document.getElementById('dashboard-container');
  const userAvatar = document.getElementById('user-avatar');
  const userName = document.getElementById('user-name');
  const guildSelect = document.getElementById('guild-select');
  const noGuildSelected = document.getElementById('no-guild-selected');
  const configForms = document.getElementById('config-forms');
  const toast = document.getElementById('toast');

  // Forms
  const formWelcomeLeave = document.getElementById('form-welcome-leave');
  const formConfessions = document.getElementById('form-confessions');
  const formQuarantine = document.getElementById('form-quarantine');
  const formLogs = document.getElementById('form-logs');
  const formAddShopItem = document.getElementById('form-add-shop-item');
  const formAddLevelReward = document.getElementById('form-add-level-reward');
  const formLevelingSettings = document.getElementById('form-leveling-settings');
  const formGame = document.getElementById('form-game');
  const formAutomod = document.getElementById('form-automod');
  const formKarma = document.getElementById('form-karma');
  const formForums = document.getElementById('form-forums');
  const formAddActionVerite = document.getElementById('form-add-action-verite');
  const actionVeriteList = document.getElementById('action-verite-list');
  const formActionVeriteChannels = document.getElementById('form-action-verite-channels');
  const formTicketPanel = document.getElementById('form-ticket-panel');
  const formTicketOption = document.getElementById('form-ticket-option');
  const ticketOptionsList = document.getElementById('ticket-options-list');
  const formBump = document.getElementById('form-bump');
  const formPermissions = document.getElementById('form-permissions');
  const formActionRewards = document.getElementById('form-action-rewards');

  // Lists
  const shopItemsList = document.getElementById('shop-items-list');
  const levelRewardsList = document.getElementById('level-rewards-list');
  const confessionsList = document.getElementById('confessions-list');

  // State
  let confessionsListState = [];
  let guildsList = [];
  let actionRewardsState = [];
  let currentUser = null;
  let currentActionVeriteItems = [];
  let channelsList = [];
  let rolesList = [];
  let membersList = [];

  // Interactive Welcome / Leave State
  let welcomeData = {
    channel_id: '',
    title: '👋 Bienvenue',
    desc: 'Bienvenue {user} sur le serveur !',
    color: '#00ff00',
    thumbnail: true,
    image_url: '',
    author_name: '',
    author_icon: '',
    footer: '',
    role_filter: ''
  };
  let leaveData = {
    channel_id: '',
    title: '👋 Au revoir',
    desc: 'Au revoir {user} !',
    color: '#ff0000',
    thumbnail: true,
    image_url: '',
    author_name: '',
    author_icon: '',
    footer: ''
  };

  // Mobile Sidebar Toggle elements
  const mobileHamburger = document.getElementById('mobile-hamburger');
  const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (mobileHamburger && sidebar && sidebarOverlay) {
    mobileHamburger.addEventListener('click', () => {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('open');
    });
  }

  if (mobileSidebarClose && sidebar && sidebarOverlay) {
    mobileSidebarClose.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }

  if (sidebarOverlay && sidebar) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }

  // Tab switching logic
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = document.getElementById(tabId);
      if (targetTab) {
        targetTab.classList.add('active');
      } else {
        console.warn('Tab not found:', tabId);
      }
      
      // Fermer le menu mobile lors du clic sur un onglet
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      }

      if (tabId === 'tab-gifs') {
        fetchAndRenderGifs();
      } else if (tabId === 'tab-map') {
        const guildId = guildSelect ? guildSelect.value : '';
        const mapIframe = document.getElementById('map-iframe');
        if (mapIframe) mapIframe.src = `map.html?guild=${guildId}`;
      }
    });
  });

  // Verify auth state
  fetch('/api/user', { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        currentUser = data.user;
        window.currentUser = data.user;
        showDashboard();
      } else {
        showLogin();
      }
    })
    .catch(err => {
      console.error('Error verifying auth:', err);
      showLogin();
    });

  function showLogin() {
    loginContainer.style.display = 'block';
    dashboardContainer.style.display = 'none';
  }

  function showDashboard() {
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    
    // User profile
    userName.textContent = currentUser.username;
    if (currentUser.avatar) {
      userAvatar.src = `https://cdn.discordapp.com/avatars/${currentUser.id}/${currentUser.avatar}.png`;
    } else {
      userAvatar.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; // default avatar
    }

    fetch('/api/guilds', { cache: 'no-store' })
      .then(res => res.json())
      .then(guilds => {
        guildsList = guilds;
        window.guildsList = guilds;
        guildSelect.innerHTML = '<option value="">Sélectionnez un serveur...</option>';
        guilds.forEach(guild => {
          const option = document.createElement('option');
          option.value = guild.id;
          option.textContent = guild.name;
          option.dataset.icon = guild.icon || '';
          guildSelect.appendChild(option);
        });

        renderServersGrid(guilds);

        return fetch('/api/selected-guild', { cache: 'no-store' });
      })
      .then(res => res.json())
      .then(data => {
        // Toujours afficher l'écran de sélection de serveur à la connexion au dashboard
        noGuildSelected.style.display = 'block';
        configForms.style.display = 'none';
        guildSelect.value = '';
        updateActiveGuildIcon('');
      })
      .catch(console.error);
  }

  function renderServersGrid(guilds) {
    const grid = document.getElementById('servers-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (guilds.length === 0) {
      grid.innerHTML = '<p style="color: #8e9297; grid-column: 1/-1;">Aucun serveur trouvé où le bot est installé avec vos permissions.</p>';
      return;
    }

    guilds.forEach(guild => {
      const card = document.createElement('div');
      card.className = 'server-card';

      const iconContainer = document.createElement('div');
      iconContainer.className = 'server-icon-container';

      if (guild.icon) {
        const iconImg = document.createElement('img');
        iconImg.className = 'server-icon-img';
        iconImg.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
        iconImg.alt = guild.name;
        iconContainer.appendChild(iconImg);
      } else {
        // Initials if no icon
        const initials = guild.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
        iconContainer.textContent = initials;
      }

      const name = document.createElement('div');
      name.className = 'server-card-name';
      name.textContent = guild.name;

      card.appendChild(iconContainer);
      card.appendChild(name);

      card.addEventListener('click', () => {
        guildSelect.value = guild.id;
        handleGuildSelection(guild.id);
        fetch('/api/select-guild', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: guild.id })
        }).catch(console.error);
      });

      grid.appendChild(card);
    });
  }

  // Guild selection
  guildSelect.addEventListener('change', () => {
    const guildId = guildSelect.value;
    if (!guildId) {
      noGuildSelected.style.display = 'block';
      configForms.style.display = 'none';
      updateActiveGuildIcon('');
      return;
    }

    handleGuildSelection(guildId);
    fetch('/api/select-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId })
    }).catch(console.error);
  });

  const activeGuildTrigger = document.getElementById('active-guild-trigger');
  const btnChangeGuildBanner = document.getElementById('btn-change-guild-banner');
  
  const resetToGuildSelection = () => {
    guildSelect.value = '';
    noGuildSelected.style.display = 'block';
    configForms.style.display = 'none';
    updateActiveGuildIcon('');
    fetch('/api/select-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId: '' })
    }).catch(console.error);
  };

  if (activeGuildTrigger) {
    activeGuildTrigger.addEventListener('click', resetToGuildSelection);
  }
  if (btnChangeGuildBanner) {
    btnChangeGuildBanner.addEventListener('click', resetToGuildSelection);
  }

  function updateActiveGuildIcon(guildId) {
    const activeTrigger = document.getElementById('active-guild-trigger');
    const activeIcon = document.getElementById('active-guild-icon');
    const activeInitials = document.getElementById('active-guild-initials');
    if (!activeTrigger) return;

    if (!guildId) {
      activeTrigger.style.display = 'none';
      return;
    }

    const guild = guildsList.find(g => g.id === guildId);
    if (!guild) {
      activeTrigger.style.display = 'none';
      return;
    }

    if (guild.icon) {
      activeIcon.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
      activeIcon.style.display = 'block';
      activeInitials.style.display = 'none';
    } else {
      const initials = guild.name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();
      activeInitials.textContent = initials;
      activeInitials.style.display = 'flex';
      activeIcon.style.display = 'none';
    }

    activeTrigger.style.display = 'flex';
  }

  async function handleGuildSelection(guildId) {
    if (!guildId) return;
    noGuildSelected.style.display = 'none';
    configForms.style.display = 'block';
    
    // S'assurer qu'au moins un onglet est actif pour afficher les formulaires
    const activeBtn = document.querySelector('.tab-btn.active');
    const activeTabContent = document.querySelector('.tab-content.active');
    if (!activeBtn || !activeTabContent) {
      const welcomeBtn = document.querySelector('.tab-btn[data-tab="tab-welcome"]');
      const welcomeTab = document.getElementById('tab-welcome');
      if (welcomeBtn) welcomeBtn.classList.add('active');
      if (welcomeTab) welcomeTab.classList.add('active');
    }

    updateActiveGuildIcon(guildId);

    const guildObj = guildsList.find(g => g.id === guildId);
    const bannerName = document.getElementById('active-guild-name-banner');
    if (bannerName && guildObj) {
      bannerName.textContent = guildObj.name;
    }

    // 1. Fetch channels, roles & members de façon sécurisée
    try {
      await Promise.all([
        fetch(`/api/channels?guildId=${guildId}`).then(res => res.json()).then(data => { channelsList = Array.isArray(data) ? data : []; }),
        fetch(`/api/roles?guildId=${guildId}`).then(res => res.json()).then(data => { rolesList = Array.isArray(data) ? data : []; }),
        fetch(`/api/members?guildId=${guildId}`).then(res => res.json()).then(data => { membersList = Array.isArray(data) ? data : []; })
      ]);
    } catch (err) {
      console.error('Erreur chargement ressources guilde:', err);
      channelsList = [];
      rolesList = [];
      membersList = [];
    }

    // 2. Remplir les dropdowns
    try {
      populateDropdowns();
    } catch (e) {
      console.error('Erreur remplissage dropdowns:', e);
    }

    // 3. Charger la configuration
    try {
      loadGuildConfiguration(guildId);
    } catch (e) {
      console.error('Erreur chargement config guilde:', e);
    }

    try {
      loadStarConfigAndLeaderboard(guildId);
    } catch (e) {
      console.error('Erreur chargement star config:', e);
    }
  }

  function populateDropdowns() {
    // Réinitialiser les champs de recherche
    document.querySelectorAll('.select-search-input').forEach(input => {
      input.value = '';
    });

    // Populate Channels
    const channelSelects = document.querySelectorAll('.channel-select');
    channelSelects.forEach(select => {
      if (select.id === 'game_announce_channel') {
        select.innerHTML = '<option value="">Salon d\'origine de la discussion</option>';
      } else if (select.id === 'autothread-channel-select') {
        select.innerHTML = '<option value="">Sélectionner un salon...</option>';
      } else {
        select.innerHTML = '<option value="">Désactivé</option>';
      }
      channelsList.forEach(ch => {
        // Option text channels only (0: GuildText, 5: GuildAnnouncement)
        if (ch.type === 0 || ch.type === 5) {
          const option = document.createElement('option');
          option.value = ch.id;
          option.textContent = `# ${ch.name}`;
          select.appendChild(option);
        }
      });
    });

    // Populate Announce Channels
    const announceSelects = document.querySelectorAll('.announce-channel-select');
    announceSelects.forEach(select => {
      select.innerHTML = `
        <option value="current">Salon actuel (où le membre parle)</option>
        <option value="disabled">Désactiver les annonces</option>
      `;
      channelsList.forEach(ch => {
        if (ch.type === 0 || ch.type === 5) {
          const option = document.createElement('option');
          option.value = ch.id;
          option.textContent = `# ${ch.name}`;
          select.appendChild(option);
        }
      });
    });

    // Populate Categories (type 4 is GuildCategory)
    const categorySelects = document.querySelectorAll('.category-select');
    categorySelects.forEach(select => {
      select.innerHTML = '<option value="">-- Créer automatiquement une catégorie --</option>';
      channelsList.forEach(ch => {
        if (ch.type === 4) {
          const option = document.createElement('option');
          option.value = ch.id;
          option.textContent = `📁 ${ch.name}`;
          select.appendChild(option);
        }
      });
    });

    // Populate Multi-Select Channels (Selfie / Nude)
    const multiChannelSelects = document.querySelectorAll('.channel-select-multi');
    multiChannelSelects.forEach(select => {
      select.innerHTML = '';
      channelsList.forEach(ch => {
        // Option text channels (0: GuildText, 5: GuildAnnouncement) et salons Forum (15: GuildForum)
        if (ch.type === 0 || ch.type === 5 || ch.type === 15) {
          const option = document.createElement('option');
          option.value = ch.id;
          const prefix = ch.type === 15 ? '💬 [Forum] ' : '# ';
          option.textContent = `${prefix}${ch.name}`;
          select.appendChild(option);
        }
      });
    });

    // Populate Roles
    const roleSelects = document.querySelectorAll('.role-select');
    roleSelects.forEach(select => {
      select.innerHTML = '<option value="">Sélectionner un rôle</option>';
      rolesList.forEach(role => {
        // Exclude @everyone role which has the same ID as the guild
        if (role.name !== '@everyone') {
          const option = document.createElement('option');
          option.value = role.id;
          option.textContent = role.name;
          select.appendChild(option);
        }
      });
    });

    // Populate Forums Checkboxes
    const forumContainer = document.getElementById('unlimited_forum_checkboxes_container');
    if (forumContainer) {
      forumContainer.innerHTML = '';
      const forums = channelsList.filter(ch => ch.type === 15);
      if (forums.length === 0) {
        forumContainer.innerHTML = '<p style="color: #8e9297; margin: 0; font-size: 0.9rem;">Aucun salon Forum trouvé sur ce serveur.</p>';
      } else {
        forums.forEach(ch => {
          const itemDiv = document.createElement('div');
          itemDiv.style.display = 'flex';
          itemDiv.style.alignItems = 'center';
          itemDiv.style.gap = '10px';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.value = ch.id;
          checkbox.className = 'forum-checkbox';
          checkbox.id = `forum_cb_${ch.id}`;
          checkbox.style.cursor = 'pointer';
          
          const label = document.createElement('label');
          label.htmlFor = `forum_cb_${ch.id}`;
          label.textContent = `📢 ${ch.name}`;
          label.style.margin = '0';
          label.style.cursor = 'pointer';
          label.style.color = '#fff';
          
          itemDiv.appendChild(checkbox);
          itemDiv.appendChild(label);
          forumContainer.appendChild(itemDiv);
        });
      }
    }

    // Populate Game Allowed Channels Checkboxes
    renderGameAllowedChannels();

    // Populate Ticket Category Select (type 4 is GuildCategory)
    const ticketCatSelect = document.getElementById('ticket_opt_category');
    if (ticketCatSelect) {
      ticketCatSelect.innerHTML = '<option value="">-- Aucune catégorie (Racine) --</option>';
      channelsList.forEach(ch => {
        if (ch.type === 4) {
          const option = document.createElement('option');
          option.value = ch.id;
          option.textContent = `📁 ${ch.name}`;
          ticketCatSelect.appendChild(option);
        }
      });
    }

    // Populate Ticket Roles Ping Select
    const ticketPingSelect = document.getElementById('ticket_opt_ping_users');
    const ticketMemberAddSelect = document.getElementById('ticket_opt_member_roles_add');
    const ticketMemberRemoveSelect = document.getElementById('ticket_opt_member_roles_remove');
    const ticketCertifyAddSelect = document.getElementById('ticket_opt_certify_roles_add');
    const ticketCertifyRemoveSelect = document.getElementById('ticket_opt_certify_roles_remove');

    const permDashSelect = document.getElementById('perm_dashboard_roles');
    const permAdminCmdsSelect = document.getElementById('perm_admin_cmds_roles');
    const permModoCmdsSelect = document.getElementById('perm_modo_cmds_roles');

    const selectToPopulate = [
      ticketPingSelect,
      ticketMemberAddSelect,
      ticketMemberRemoveSelect,
      ticketCertifyAddSelect,
      ticketCertifyRemoveSelect,
      permDashSelect,
      permAdminCmdsSelect,
      permModoCmdsSelect
    ];

    selectToPopulate.forEach(selectEl => {
      if (selectEl) {
        selectEl.innerHTML = '';
        rolesList.forEach(r => {
          const option = document.createElement('option');
          option.value = r.id;
          option.textContent = r.name;
          selectEl.appendChild(option);
        });
      }
    });

    // Synchroniser tous les sélecteurs de recherche personnalisés
    document.querySelectorAll('.channel-select, .announce-channel-select, .role-select, .custom-select').forEach(select => {
      if (select.syncCustomSelect) {
        select.syncCustomSelect();
      }
    });

    if (typeof updatePermissionsRoleBadges === 'function') {
      updatePermissionsRoleBadges();
    }
  }

  let currentAllowedGameChannels = [];

  function renderGameAllowedChannels(allowedArray = null) {
    if (allowedArray !== null) {
      if (Array.isArray(allowedArray)) {
        currentAllowedGameChannels = allowedArray;
      } else if (typeof allowedArray === 'string') {
        try {
          currentAllowedGameChannels = JSON.parse(allowedArray);
        } catch (e) {
          currentAllowedGameChannels = allowedArray.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    const container = document.getElementById('game_allowed_channels_checkboxes_container');
    if (!container) return;

    if (!channelsList || channelsList.length === 0) {
      container.innerHTML = '<p style="font-size: 0.85rem; color: #72767d; margin: 0;">Aucun salon trouvé ou chargement des salons...</p>';
      return;
    }

    const textChannels = channelsList.filter(ch => ch.type === 0 || ch.type === 5 || ch.type === undefined);
    if (textChannels.length === 0) {
      container.innerHTML = '<p style="font-size: 0.85rem; color: #72767d; margin: 0;">Aucun salon textuel disponible.</p>';
      return;
    }

    container.innerHTML = textChannels.map(ch => {
      const isChecked = currentAllowedGameChannels.length === 0 || currentAllowedGameChannels.includes(ch.id) || currentAllowedGameChannels.includes(String(ch.id));
      return `
        <label style="display: flex; align-items: center; gap: 8px; font-size: 0.88rem; color: #e0e0e0; cursor: pointer; padding: 5px 8px; border-radius: 4px; background: rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <input type="checkbox" class="game-allowed-channel-cb" value="${ch.id}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px; accent-color: #5865F2;">
          <span># ${ch.name}</span>
        </label>
      `;
    }).join('');
  }

  function toggleAllGameChannels(checked) {
    document.querySelectorAll('.game-allowed-channel-cb').forEach(cb => cb.checked = checked);
  }

  function safeSetVal(id, val) {
    const el = document.getElementById(id);
    if (el) {
      el.value = (val !== undefined && val !== null) ? val : '';
      if (el.syncCustomSelect) el.syncCustomSelect();
    }
  }

  function safeSetCheck(id, bool) {
    const el = document.getElementById(id);
    if (el) el.checked = !!bool;
  }

  function loadGuildConfiguration(guildId) {
    const targetGuildId = guildId || (guildSelect ? guildSelect.value : '');
    const url = targetGuildId ? `/api/config?guildId=${targetGuildId}` : '/api/config';
    fetch(url)
      .then(res => res.json())
      .then(config => {
        // Welcome / Leave
        const wl = config.welcome_leave || {};
        fetchBotInfo(wl.custom_bot_avatar || null);
        welcomeData = {
          channel_id: wl.welcome_channel || '',
          title: wl.welcome_title || '👋 Bienvenue',
          desc: wl.welcome_desc || 'Bienvenue {user} sur le serveur !',
          color: wl.welcome_color || '#00ff00',
          thumbnail: wl.welcome_thumbnail !== undefined ? !!wl.welcome_thumbnail : true,
          image_url: wl.welcome_image || '',
          author_name: wl.welcome_author_name || '',
          author_icon: wl.welcome_author_icon || '',
          footer: wl.welcome_footer || '',
          role_filter: wl.welcome_role_filter || ''
        };
        leaveData = {
          channel_id: wl.leave_channel || '',
          title: wl.leave_title || '👋 Au revoir',
          desc: wl.leave_desc || 'Au revoir {user} !',
          color: wl.leave_color || '#ff0000',
          thumbnail: wl.leave_thumbnail !== undefined ? !!wl.leave_thumbnail : true,
          image_url: wl.leave_image || '',
          author_name: wl.leave_author_name || '',
          author_icon: wl.leave_author_icon || '',
          footer: wl.leave_footer || ''
        };
        try { updateInteractiveEditor(); } catch (e) {}

        // Confessions (salons multiples)
        confessionsListState = config.confessions || [];
        try { renderConfessions(confessionsListState); } catch (e) {}

        // Jeu Mot Caché
        const game = config.game_config || {};
        safeSetCheck('game_is_active', game.is_active);
        safeSetVal('game_secret_phrase', game.secret_phrase);
        safeSetVal('game_reward_money', game.reward_money ?? 0);
        safeSetVal('game_reward_xp', game.reward_xp ?? 0);
        safeSetVal('game_reward_chance', game.reward_chance ?? 0);
        safeSetVal('game_reward_role_id', game.reward_role_id);
        safeSetVal('game_appearance_chance', game.appearance_chance ?? 15);
        safeSetVal('game_letter_emoji', game.letter_emoji || '🔍');
        const announceChanSel = document.getElementById('game_announce_channel');
        if (announceChanSel) {
          announceChanSel.value = (game.announce_channel === 'dm') ? '' : (game.announce_channel || '');
          if (announceChanSel.syncCustomSelect) announceChanSel.syncCustomSelect();
        }
        safeSetCheck('game_ephemeral_letters', (game.ephemeral_letters === undefined || game.ephemeral_letters === null) ? true : !!game.ephemeral_letters);
        safeSetCheck('game_reset_progress', false);
        try { renderGameAllowedChannels(game.allowed_channels); } catch (e) { console.error('Erreur render game channels:', e); }

        // Quarantaine
        const quar = config.quarantine || {};
        safeSetVal('quarantine_role', quar.role_id);
        safeSetVal('quarantine_channel', quar.channel_id);

        // Logs
        const logs = config.logs || {};
        let channelMap = {};
        try {
          if (logs.channel_id && logs.channel_id.startsWith('{')) {
            channelMap = JSON.parse(logs.channel_id);
          } else if (logs.channel_id) {
            const legId = logs.channel_id;
            channelMap = {
              messages: legId, members: legId, voice: legId, moderation: legId, structure: legId, bots: legId, confessions: legId
            };
          }
        } catch (e) {}

        const activeCategories = logs.events ? logs.events.split(',') : [];
        const isLegacyAll = !logs.events || logs.events === 'all';
        const categories = ['messages', 'members', 'voice', 'moderation', 'structure', 'bots', 'tickets', 'pseudo', 'roles', 'confessions'];
        
        categories.forEach(cat => {
          safeSetCheck(`log_enable_${cat}`, isLegacyAll ? true : activeCategories.includes(cat));
          safeSetVal(`log_channel_${cat}`, channelMap[cat]);
        });

        // Shop Items & Level Rewards
        try { renderShopItems(config.shop || []); } catch (e) {}
        try { renderLevelRewards(config.level_rewards || []); } catch (e) {}

        // Leveling Config
        const lvl = config.leveling_config || {};
        safeSetVal('xp_min', lvl.xp_min ?? 15);
        safeSetVal('xp_max', lvl.xp_max ?? 25);
        safeSetVal('xp_base', lvl.xp_base ?? 120);
        safeSetVal('xp_factor', lvl.xp_factor ?? 1.35);
        safeSetVal('karma_min', lvl.karma_min ?? 1);
        safeSetVal('karma_max', lvl.karma_max ?? 3);
        safeSetVal('money_min', lvl.money_min ?? 2);
        safeSetVal('money_max', lvl.money_max ?? 5);
        safeSetVal('nsfw_xp_reward', lvl.nsfw_xp_reward ?? 0);
        safeSetVal('nsfw_money_reward', lvl.nsfw_money_reward ?? 0);
        safeSetVal('announce_channel', lvl.announce_channel || 'current');
        safeSetVal('announce_msg', lvl.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !');
        
        // Tribunal Category & Roles & Prefix
        const trib = config.tribunal_config || {};
        safeSetVal('tribunal_category', trib.categoryId);
        safeSetVal('tribunal_channel_prefix', trib.channelPrefix || '⚖️┆procès-');
        safeSetVal('tribunal_auto_delete_minutes', trib.autoDeleteMinutes ?? 5);

        const tribAccessRolesEl = document.getElementById('tribunal_access_roles');
        if (tribAccessRolesEl) {
          const selectedAccess = trib.accessRoles || [];
          Array.from(tribAccessRolesEl.options).forEach(opt => {
            opt.selected = selectedAccess.includes(opt.value);
          });
          if (tribAccessRolesEl.syncCustomSelect) tribAccessRolesEl.syncCustomSelect();
        }

        safeSetVal('tribunal_judge_role', trib.judgeRoleId);
        safeSetVal('tribunal_lawyer_role', trib.lawyerRoleId);
        safeSetVal('tribunal_accused_role', trib.accusedRoleId);
        safeSetVal('tribunal_plaintiff_role', trib.plaintiffRoleId);

        // Shop Config
        const shopCfg = config.shop_config || {};
        safeSetVal('private_suite_category_id', shopCfg.privateSuiteCategoryId);
        safeSetVal('suite_channel_prefix', shopCfg.suiteChannelPrefix || '👑┆suite-');
        
        if (typeof updateXpCurvePreview === 'function') {
          try { updateXpCurvePreview(); } catch (e) {}
        }

        // Automod Config
        const am = config.automod_config || {};
        safeSetCheck('automod_anti_link', am.anti_link === 1);
        safeSetCheck('automod_anti_spam', am.anti_spam === 1);
        safeSetCheck('automod_anti_massmention', am.anti_massmention === 1);
        safeSetCheck('automod_anti_badwords', am.anti_badwords === 1);
        safeSetVal('automod_spam_max_msgs', am.spam_max_msgs ?? 5);
        safeSetVal('automod_massmention_limit', am.massmention_limit ?? 5);
        safeSetVal('automod_badwords_list', am.badwords_list || '');
        safeSetVal('automod_bypass_roles', am.bypass_roles || '');

        // Boost Config
        const bst = config.boost_config || {};
        safeSetCheck('boost_enabled', bst.enabled !== 0);
        safeSetVal('boost_channel', bst.channel_id || '');
        safeSetVal('boost_color', bst.color || '#F47FFF');
        safeSetVal('boost_title', bst.title || '🚀 Nouveau Boost de Serveur !');
        safeSetVal('boost_message', bst.message || '🎉 Un grand MERCI à {user.mention} d\'avoir boosté **{server}** ! Grâce à toi, le serveur gagne en puissance ! 💖');
        safeSetVal('boost_reward_money', bst.reward_money ?? 5000);
        safeSetVal('boost_reward_karma', bst.reward_karma ?? 50);
        safeSetVal('boost_image_url', bst.image_url || '');

        // Auto-rôles & Counting renders
        try { renderAutoroleJoin(config.autoroles_on_join || []); } catch (e) {}
        try { renderAutoroleRole(config.autoroles_on_role || []); } catch (e) {}
        try { renderActiveAutoroles(config.autorole_embeds || []); } catch (e) {}
        try { renderSimpleEmbedsSavedList(config.autorole_embeds || []); } catch (e) {}
        try { renderCountingChannels(config.counting_channels || []); } catch (e) {}
        if (typeof updateAutorolePreview === 'function') try { updateAutorolePreview(); } catch (e) {}

        // Permissions Configuration
        const perms = config.permissions_config || {};
        safeSetVal('perm_admin_role_id', perms.admin_role_id);
        safeSetVal('perm_modo_role_id', perms.modo_role_id);

        let dashRoles = [];
        let adminCmdsRoles = [];
        let modoCmdsRoles = [];
        try { dashRoles = typeof perms.dashboard_roles === 'string' ? JSON.parse(perms.dashboard_roles || '[]') : (perms.dashboard_roles || []); } catch (_) {}
        try { adminCmdsRoles = typeof perms.admin_cmds_roles === 'string' ? JSON.parse(perms.admin_cmds_roles || '[]') : (perms.admin_cmds_roles || []); } catch (_) {}
        try { modoCmdsRoles = typeof perms.modo_cmds_roles === 'string' ? JSON.parse(perms.modo_cmds_roles || '[]') : (perms.modo_cmds_roles || []); } catch (_) {}

        const setMultiSelectValues = (selectId, valuesArr) => {
          const sel = document.getElementById(selectId);
          if (!sel) return;
          Array.from(sel.options).forEach(opt => {
            opt.selected = valuesArr.includes(opt.value);
          });
          if (sel.syncCustomSelect) sel.syncCustomSelect();
          sel.dispatchEvent(new Event('change'));
        };

        setMultiSelectValues('perm_dashboard_roles', dashRoles);
        setMultiSelectValues('perm_admin_cmds_roles', adminCmdsRoles);
        setMultiSelectValues('perm_modo_cmds_roles', modoCmdsRoles);

        if (typeof updatePermissionsRoleBadges === 'function') {
          try { updatePermissionsRoleBadges(); } catch (e) {}
        }

        // Charger Karma, Forums, Auto-Thread, Action-Verite, Tickets, AI, etc.
        fetch('/api/config/karma')
          .then(res => res.json())
          .then(karma => {
            safeSetCheck('karma_is_active', karma.is_active);
            safeSetCheck('karma_announce_rewards', karma.announce_rewards);
            safeSetVal('karma_threshold_1', karma.threshold_1 ?? 20);
            safeSetVal('karma_xp_mult_1', karma.xp_mult_1 ?? 1.2);
            safeSetVal('karma_discount_1', karma.discount_1 ?? 5);
            safeSetVal('karma_threshold_2', karma.threshold_2 ?? 50);
            safeSetVal('karma_xp_mult_2', karma.xp_mult_2 ?? 1.5);
            safeSetVal('karma_discount_2', karma.discount_2 ?? 10);
            safeSetVal('karma_threshold_3', karma.threshold_3 ?? 100);
            safeSetVal('karma_xp_mult_3', karma.xp_mult_3 ?? 2.0);
            safeSetVal('karma_discount_3', karma.discount_3 ?? 20);
          })
          .catch(console.error);

        fetch('/api/config/unlimited-forums')
          .then(res => res.json())
          .then(data => {
            const checkboxes = document.querySelectorAll('.forum-checkbox');
            checkboxes.forEach(cb => {
              cb.checked = data.channels && data.channels.includes(cb.value);
            });
          })
          .catch(console.error);

        fetch('/api/config/autothread')
          .then(res => res.json())
          .then(data => {
            try { renderAutoThreadChannels(data.channels || []); } catch (e) {}
          })
          .catch(console.error);

        fetch('/api/config/action-verite/channels')
          .then(res => res.json())
          .then(config => {
            safeSetVal('av_sfw_channel', config.sfw_channel_id);
            safeSetVal('av_nsfw_channel', config.nsfw_channel_id);
          })
          .catch(console.error);

        fetch('/api/config/action-verite')
          .then(res => res.json())
          .then(items => {
            try { renderActionVerite(items); } catch (e) {}
          })
          .catch(console.error);

        fetch('/api/config/tickets')
          .then(res => res.json())
          .then(data => {
            currentTicketPanels = data.panels || [];
            currentTicketOptions = data.options || [];

            try {
              renderTicketPanelsList(currentTicketPanels, currentTicketOptions);
              renderTicketOptions(currentTicketOptions);
            } catch (e) {}

            const panelIdInput = document.getElementById('ticket_panel_id');
            if (panelIdInput && panelIdInput.value) {
              const currentEditing = currentTicketPanels.find(p => p.id == panelIdInput.value);
              if (currentEditing) {
                try { loadPanelIntoForm(currentEditing, currentTicketOptions); } catch (e) {}
              } else if (currentTicketPanels.length > 0) {
                try { loadPanelIntoForm(currentTicketPanels[0], currentTicketOptions); } catch (e) {}
              } else {
                try { resetPanelForm(currentTicketOptions); } catch (e) {}
              }
            } else if (currentTicketPanels.length > 0) {
              try { loadPanelIntoForm(currentTicketPanels[0], currentTicketOptions); } catch (e) {}
            } else {
              try { resetPanelForm(currentTicketOptions); } catch (e) {}
            }
          })
          .catch(console.error);

        fetch('/api/config/ai')
          .then(res => res.json())
          .then(data => {
            const config = data.config || {};
            const keys = data.keys || [];

            safeSetVal('ai_preferred_provider', config.preferred_provider || 'auto');
            safeSetVal('ai_groq_text_model', config.groq_text_model || 'llama-3.3-70b-versatile');
            safeSetVal('ai_groq_vision_model', config.groq_vision_model || 'llama-3.2-11b-vision-preview');
            safeSetVal('ai_groq_server_model', config.groq_server_model || 'llama-3.3-70b-versatile');
            safeSetVal('ai_gemini_model', config.gemini_model || 'gemini-2.0-flash');

            try { renderAiKeys(keys); } catch (e) {}
          })
          .catch(console.error);

        fetch('/api/config/action-rewards')
          .then(res => res.json())
          .then(rewards => {
            actionRewardsState = rewards;
            try { renderActionRewards(actionRewardsState); } catch (e) {}
          })
          .catch(console.error);

        // Charger la configuration des Bumps
        const bump = config.bump_config || {};
        const reminderChanSelect = document.getElementById('bump_reminder_channel');
        const reminderRoleSelect = document.getElementById('bump_reminder_role');
        if (reminderChanSelect) {
          reminderChanSelect.value = bump.reminder_channel || '';
          if (reminderChanSelect.syncCustomSelect) reminderChanSelect.syncCustomSelect();
        }
        if (reminderRoleSelect) {
          reminderRoleSelect.value = bump.reminder_role || '';
          if (reminderRoleSelect.syncCustomSelect) reminderRoleSelect.syncCustomSelect();
        }

        // Charger les thèmes de cartes par rôle
        loadRoleThemes();
        loadRoleBoosters();
        loadInviteTracker();

        // Charger les fonctionnalités avancées
        try { loadCustomCommands(targetGuildId); } catch(e) {}
        try { loadWordReactions(targetGuildId); } catch(e) {}
        try { loadServerBotProfile(targetGuildId); } catch(e) {}
      })
      .catch(console.error);
  }

  // --- INTERACTIVE EMBED EDITOR BINDINGS ---

  function updateInteractiveEditor() {
    const editModeEl = document.getElementById('edit-mode-select');
    if (!editModeEl) return;
    const mode = editModeEl.value;
    const data = mode === 'welcome' ? (welcomeData || {}) : (leaveData || {});

    safeSetVal('target-channel-select', data.channel_id || '');
    safeSetVal('embed-color-picker', data.color || (mode === 'welcome' ? '#00ff00' : '#ff0000'));
    safeSetVal('embed-title-input', data.title || (mode === 'welcome' ? '👋 Bienvenue' : '👋 Au revoir'));
    safeSetVal('embed-desc-field', data.desc || (mode === 'welcome' ? 'Bienvenue {user} sur le serveur !' : 'Au revoir {user} !'));

    const leftBar = document.getElementById('discord-left-bar');
    if (leftBar) leftBar.style.borderColor = data.color || (mode === 'welcome' ? '#00ff00' : '#ff0000');

    safeSetCheck('embed-thumbnail-checkbox', data.thumbnail !== undefined ? data.thumbnail : true);
    safeSetVal('embed-author-name-input', data.author_name || '');
    safeSetVal('embed-author-icon-input', data.author_icon || '');

    const authorImg = document.getElementById('embed-author-icon-img');
    const authorIconWrapper = document.getElementById('author-icon-wrapper');
    if (authorImg && authorIconWrapper) {
      if (data.author_icon) {
        authorImg.src = data.author_icon;
        authorImg.style.display = 'block';
        authorIconWrapper.style.display = 'flex';
      } else {
        authorImg.style.display = 'none';
        authorIconWrapper.style.display = 'none';
      }
    }

    safeSetVal('embed-footer-input', data.footer || '');

    const filterGroup = document.getElementById('welcome-role-filter-group');
    if (filterGroup) {
      if (mode === 'welcome') {
        filterGroup.style.display = 'block';
        safeSetVal('welcome-role-filter-select', welcomeData.role_filter || '');
      } else {
        filterGroup.style.display = 'none';
      }
    }

    const thumbImg = document.getElementById('discord-thumbnail-img');
    const thumbToggleText = document.getElementById('thumbnail-toggle-text');
    const thumbBox = document.getElementById('discord-thumbnail-box');
    if (data.thumbnail !== false) {
      if (thumbImg) thumbImg.style.display = 'block';
      if (thumbToggleText) thumbToggleText.textContent = 'Photo Active';
      if (thumbBox) thumbBox.style.opacity = '1';
    } else {
      if (thumbImg) thumbImg.style.display = 'none';
      if (thumbToggleText) thumbToggleText.textContent = 'Masquée';
      if (thumbBox) thumbBox.style.opacity = '0.6';
    }

    const mainImg = document.getElementById('discord-image-img');
    const overlayImg = document.getElementById('discord-image-overlay');
    const wrapperImg = document.getElementById('image-url-wrapper');
    if (data.image_url) {
      if (mainImg) {
        mainImg.src = data.image_url;
        mainImg.style.display = 'block';
      }
      if (overlayImg) overlayImg.style.display = 'none';
      safeSetVal('embed-image-input', data.image_url);
      if (wrapperImg) wrapperImg.style.display = 'flex';
    } else {
      if (mainImg) mainImg.style.display = 'none';
      if (overlayImg) overlayImg.style.display = 'flex';
      safeSetVal('embed-image-input', '');
      if (wrapperImg) wrapperImg.style.display = 'none';
    }

    const titleInput = document.getElementById('embed-title-input');
    if (titleInput) titleInput.dispatchEvent(new Event('input'));
    const descField = document.getElementById('embed-desc-field');
    if (descField) descField.dispatchEvent(new Event('input'));
  }

  function fetchBotInfo(customAvatar = null) {
    const currentGuildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    const url = currentGuildId ? `/api/bot/info?guildId=${currentGuildId}` : '/api/bot/info';
    fetch(url)
      .then(res => res.json())
      .then(info => {
        const avatarUrl = customAvatar || info.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const botAvatars = document.querySelectorAll('#bot-avatar-preview, #autorole-bot-avatar-preview, #sondage-bot-avatar, #simple-embed-preview-bot-avatar, #ticket-preview-bot-avatar, #sbp-preview-img');
        botAvatars.forEach(img => {
          if (img) img.src = avatarUrl;
        });
        document.querySelectorAll('.discord-bot-name, #simple-embed-preview-bot-name, #ticket-preview-bot-name').forEach(el => {
          if (el) el.textContent = info.username || 'Bagbot Elite';
        });
      })
      .catch(console.error);
  }

  document.getElementById('edit-mode-select').addEventListener('change', updateInteractiveEditor);

  document.getElementById('target-channel-select').addEventListener('change', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    if (mode === 'welcome') {
      welcomeData.channel_id = e.target.value;
    } else {
      leaveData.channel_id = e.target.value;
    }
  });

  document.getElementById('embed-color-picker').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    const color = e.target.value;
    if (mode === 'welcome') {
      welcomeData.color = color;
    } else {
      leaveData.color = color;
    }
    document.getElementById('discord-left-bar').style.borderColor = color;
  });

  document.getElementById('embed-title-input').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    if (mode === 'welcome') {
      welcomeData.title = e.target.value;
    } else {
      leaveData.title = e.target.value;
    }
  });

  document.getElementById('embed-desc-field').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    if (mode === 'welcome') {
      welcomeData.desc = e.target.value;
    } else {
      leaveData.desc = e.target.value;
    }
  });

  document.getElementById('embed-author-name-input').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    if (mode === 'welcome') {
      welcomeData.author_name = e.target.value;
    } else {
      leaveData.author_name = e.target.value;
    }
  });

  document.getElementById('discord-author-box').addEventListener('click', (e) => {
    if (e.target.closest('#author-icon-wrapper') || e.target.id === 'embed-author-name-input') return;
    const wrapper = document.getElementById('author-icon-wrapper');
    const input = document.getElementById('embed-author-icon-input');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'flex';
      input.focus();
    } else {
      if (!input.value) {
        wrapper.style.display = 'none';
      }
    }
  });

  document.getElementById('embed-author-icon-input').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    const url = e.target.value;
    if (mode === 'welcome') {
      welcomeData.author_icon = url;
    } else {
      leaveData.author_icon = url;
    }
    
    const img = document.getElementById('embed-author-icon-img');
    if (url) {
      img.src = url;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }
  });



  document.getElementById('embed-footer-input').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    if (mode === 'welcome') {
      welcomeData.footer = e.target.value;
    } else {
      leaveData.footer = e.target.value;
    }
  });

  document.getElementById('welcome-role-filter-select').addEventListener('change', (e) => {
    welcomeData.role_filter = e.target.value;
  });

  document.getElementById('discord-thumbnail-box').addEventListener('click', () => {
    const mode = document.getElementById('edit-mode-select').value;
    const data = mode === 'welcome' ? welcomeData : leaveData;
    data.thumbnail = !data.thumbnail;
    updateInteractiveEditor();
  });

  document.getElementById('discord-image-box').addEventListener('click', (e) => {
    if (e.target.closest('#image-url-wrapper')) return;
    const wrapper = document.getElementById('image-url-wrapper');
    const input = document.getElementById('embed-image-input');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'flex';
      input.focus();
    } else {
      if (!input.value) {
        wrapper.style.display = 'none';
      }
    }
  });

  document.getElementById('embed-image-input').addEventListener('input', (e) => {
    const mode = document.getElementById('edit-mode-select').value;
    const url = e.target.value;
    if (mode === 'welcome') {
      welcomeData.image_url = url;
    } else {
      leaveData.image_url = url;
    }
    
    const img = document.getElementById('discord-image-img');
    const overlay = document.getElementById('discord-image-overlay');
    if (url) {
      img.src = url;
      img.style.display = 'block';
      overlay.style.display = 'none';
    } else {
      img.style.display = 'none';
      overlay.style.display = 'flex';
    }
  });



  document.getElementById('btn-change-bot-avatar').addEventListener('click', (e) => {
    if (e && e.target && e.target.closest('#bot-avatar-wrapper')) return;
    const wrapper = document.getElementById('bot-avatar-wrapper');
    const input = document.getElementById('bot-avatar-url-input');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'flex';
      input.focus();
    } else {
      if (!input.value) {
        wrapper.style.display = 'none';
      }
    }
  });

  document.getElementById('bot-avatar-url-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const avatar_url = e.target.value;
      if (!avatar_url) return;
      
      showToast('Mise à jour de l\'avatar du bot...');
      fetch('/api/bot/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Image d\'avatar de l\'embed mise à jour avec succès !');
          e.target.value = '';
          document.getElementById('bot-avatar-wrapper').style.display = 'none';
          fetchBotInfo(resData.avatarURL);
        } else {
          showToast('Erreur: ' + (resData.error || 'inconnue'), true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    }
  });

  // --- SUBMISSIONS ---

  // 1. Welcome / Leave
  formWelcomeLeave.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      welcome_channel: welcomeData.channel_id,
      welcome_title: welcomeData.title,
      welcome_desc: welcomeData.desc,
      welcome_color: welcomeData.color,
      welcome_thumbnail: welcomeData.thumbnail,
      welcome_image: welcomeData.image_url,
      welcome_author_name: welcomeData.author_name,
      welcome_author_icon: welcomeData.author_icon,
      welcome_footer: welcomeData.footer,
      welcome_role_filter: welcomeData.role_filter,

      leave_channel: leaveData.channel_id,
      leave_title: leaveData.title,
      leave_desc: leaveData.desc,
      leave_color: leaveData.color,
      leave_thumbnail: leaveData.thumbnail,
      leave_image: leaveData.image_url,
      leave_author_name: leaveData.author_name,
      leave_author_icon: leaveData.author_icon,
      leave_footer: leaveData.footer
    };

    saveConfig('/api/config/welcome-leave', data);
  });

  // 2. Confessions
  formConfessions.addEventListener('submit', (e) => {
    e.preventDefault();
    const validConfessions = confessionsListState.filter(c => c.channel_id);
    saveConfig('/api/config/confessions', { channels: validConfessions });
  });

  // Ajouter une ligne de confession
  document.getElementById('btn-add-confession-row').addEventListener('click', () => {
    confessionsListState.push({
      channel_id: '',
      confession_name: '💬 Confession Anonyme',
      use_thread: 0,
      require_validation: 0,
      validation_channel_id: '',
      ping_role_id: ''
    });
    renderConfessions(confessionsListState);
  });

  function renderConfessions(channels) {
    confessionsList.innerHTML = '';
    
    if (channels.length === 0) {
      confessionsList.innerHTML = `
        <tr>
          <td colspan="7" class="text-center" style="color: #8e9297; padding: 20px;">Aucun salon de confession configuré. Cliquez sur le bouton ci-dessous pour en ajouter un.</td>
        </tr>
      `;
      return;
    }
    
    channels.forEach((ch, idx) => {
      const row = document.createElement('tr');
      
      // 1. Target channel select
      const tdChannel = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'inner-select channel-select';
      select.required = true;
      select.innerHTML = '<option value="">Sélectionner un salon</option>';
      channelsList.forEach(c => {
        if (c.type === 0 || c.type === 5) {
          const option = document.createElement('option');
          option.value = c.id;
          option.textContent = `# ${c.name}`;
          if (c.id === ch.channel_id) option.selected = true;
          select.appendChild(option);
        }
      });
      select.addEventListener('change', (e) => {
        ch.channel_id = e.target.value;
      });
      tdChannel.appendChild(select);
      
      // 2. Custom title input
      const tdTitle = document.createElement('td');
      const inputTitle = document.createElement('input');
      inputTitle.type = 'text';
      inputTitle.className = 'inner-input';
      inputTitle.placeholder = 'ex: 💬 Confession Anonyme';
      inputTitle.value = ch.confession_name || '💬 Confession Anonyme';
      inputTitle.addEventListener('input', (e) => {
        ch.confession_name = e.target.value;
      });
      tdTitle.appendChild(inputTitle);
      
      // 3. Thread checkbox
      const tdThread = document.createElement('td');
      tdThread.style.textAlign = 'center';
      const labelSwitch = document.createElement('label');
      labelSwitch.className = 'switch-label';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = ch.use_thread === 1;
      checkbox.addEventListener('change', (e) => {
        ch.use_thread = e.target.checked ? 1 : 0;
      });
      const spanSlider = document.createElement('span');
      spanSlider.className = 'slider';
      labelSwitch.appendChild(checkbox);
      labelSwitch.appendChild(spanSlider);
      tdThread.appendChild(labelSwitch);

      // 4. Require Validation checkbox
      const tdValCheck = document.createElement('td');
      tdValCheck.style.textAlign = 'center';
      const labelValSwitch = document.createElement('label');
      labelValSwitch.className = 'switch-label';
      const cbVal = document.createElement('input');
      cbVal.type = 'checkbox';
      cbVal.checked = ch.require_validation === 1;
      const spanValSlider = document.createElement('span');
      spanValSlider.className = 'slider';
      labelValSwitch.appendChild(cbVal);
      labelValSwitch.appendChild(spanValSlider);
      tdValCheck.appendChild(labelValSwitch);

      // 5. Validation Channel Select
      const tdValChan = document.createElement('td');
      const selectValChan = document.createElement('select');
      selectValChan.className = 'inner-select channel-select';
      selectValChan.disabled = ch.require_validation !== 1;
      selectValChan.innerHTML = '<option value="">Salon par défaut (ou public)</option>';
      channelsList.forEach(c => {
        if (c.type === 0 || c.type === 5) {
          const option = document.createElement('option');
          option.value = c.id;
          option.textContent = `# ${c.name}`;
          if (c.id === ch.validation_channel_id) option.selected = true;
          selectValChan.appendChild(option);
        }
      });
      selectValChan.addEventListener('change', (e) => {
        ch.validation_channel_id = e.target.value;
      });
      tdValChan.appendChild(selectValChan);

      // 6. Ping Staff Role Select
      const tdPingRole = document.createElement('td');
      const selectPingRole = document.createElement('select');
      selectPingRole.className = 'inner-select role-select';
      selectPingRole.disabled = ch.require_validation !== 1;
      selectPingRole.innerHTML = '<option value="">Aucun ping rôle</option>';
      rolesList.forEach(r => {
        if (r.name !== '@everyone') {
          const option = document.createElement('option');
          option.value = r.id;
          option.textContent = `@ ${r.name}`;
          if (r.id === ch.ping_role_id) option.selected = true;
          selectPingRole.appendChild(option);
        }
      });
      selectPingRole.addEventListener('change', (e) => {
        ch.ping_role_id = e.target.value;
      });
      tdPingRole.appendChild(selectPingRole);

      cbVal.addEventListener('change', (e) => {
        ch.require_validation = e.target.checked ? 1 : 0;
        selectValChan.disabled = !e.target.checked;
        selectPingRole.disabled = !e.target.checked;
      });
      
      // 7. Actions delete button
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-gif';
      btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
      btnDel.addEventListener('click', () => {
        confessionsListState.splice(idx, 1);
        renderConfessions(confessionsListState);
      });
      tdActions.appendChild(btnDel);
      
      row.appendChild(tdChannel);
      row.appendChild(tdTitle);
      row.appendChild(tdThread);
      row.appendChild(tdValCheck);
      row.appendChild(tdValChan);
      row.appendChild(tdPingRole);
      row.appendChild(tdActions);
      
      confessionsList.appendChild(row);
    });
  }

  function renderActionVerite(items) {
    currentActionVeriteItems = items || [];
    const filterVal = document.getElementById('filter-action-verite')?.value || 'all';
    let filtered = [...currentActionVeriteItems];
    if (filterVal === 'action_sfw') {
      filtered = filtered.filter(item => item.type === 'action' && item.category === 'sfw');
    } else if (filterVal === 'verite_sfw') {
      filtered = filtered.filter(item => item.type === 'verite' && item.category === 'sfw');
    } else if (filterVal === 'action_nsfw') {
      filtered = filtered.filter(item => item.type === 'action' && item.category === 'nsfw');
    } else if (filterVal === 'verite_nsfw') {
      filtered = filtered.filter(item => item.type === 'verite' && item.category === 'nsfw');
    }
    renderActionVeriteTableOnly(filtered);
  }

  function renderActionVeriteTableOnly(items) {
    actionVeriteList.innerHTML = '';
    if (items.length === 0) {
      actionVeriteList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="color: #8e9297;">Aucune question ou défi correspondant à ce filtre.</td>
        </tr>
      `;
      return;
    }

    items.forEach(item => {
      const row = document.createElement('tr');

      const tdType = document.createElement('td');
      tdType.innerHTML = item.type === 'action' ? '🎬 <span style="color:#e74c3c;font-weight:bold;">Action</span>' : '💬 <span style="color:#3498db;font-weight:bold;">Vérité</span>';

      const tdCat = document.createElement('td');
      tdCat.innerHTML = item.category === 'sfw' ? '🟢 <span style="color:#2ecc71;">SFW (Standard)</span>' : '🔞 <span style="color:#e74c3c;">NSFW (Adulte)</span>';

      const tdContent = document.createElement('td');
      tdContent.textContent = item.content;

      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-gif';
      btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
      btnDel.addEventListener('click', () => {
        if (!confirm(`Supprimer cet élément ?\n"${item.content.substring(0, 30)}..."`)) return;
        fetch('/api/config/action-verite/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: item.id })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('Élément supprimé !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        })
        .catch(err => showToast('Erreur: ' + err.message, true));
      });
      tdActions.appendChild(btnDel);

      row.appendChild(tdType);
      row.appendChild(tdCat);
      row.appendChild(tdContent);
      row.appendChild(tdActions);

      actionVeriteList.appendChild(row);
    });
  }

  function renderTicketOptions(options) {
    ticketOptionsList.innerHTML = '';
    if (options.length === 0) {
      ticketOptionsList.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="color: #8e9297;">Aucune catégorie de ticket configurée. Créez-en une ci-dessus.</td>
        </tr>
      `;
      return;
    }

    options.forEach(opt => {
      const row = document.createElement('tr');

      // Option label + value
      const tdLabel = document.createElement('td');
      tdLabel.innerHTML = `<strong>${opt.label}</strong><br><small style="color: #b9bbbe;">value: ${opt.value}</small>`;

      // Emoji / Button color
      const tdStyle = document.createElement('td');
      let styleText = 'N/A (Select menu)';
      const btnStyle = opt.button_style || 'Primary';
      let colorDot = '#5865F2';
      if (btnStyle === 'Secondary') colorDot = '#4f545c';
      if (btnStyle === 'Success') colorDot = '#43b581';
      if (btnStyle === 'Danger') colorDot = '#f04747';

      const emojiText = opt.emoji ? `${opt.emoji} ` : '';
      tdStyle.innerHTML = `${emojiText}<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${colorDot};margin-right:5px;"></span>${btnStyle}`;

      // Parent category
      const tdCategory = document.createElement('td');
      tdCategory.textContent = opt.category_id ? (getChannelName(opt.category_id) || opt.category_id) : 'Racine';

      // Required role
      const tdReqRole = document.createElement('td');
      tdReqRole.innerHTML = opt.required_role_id ? `<span style="background: rgba(88,101,242,0.2); padding: 2px 6px; border-radius: 4px; color: #7289da;">@${getRoleName(opt.required_role_id)}</span>` : '<span style="color:#8e9297;">Tout le monde</span>';

      // Support roles & pings
      const tdSupport = document.createElement('td');
      let rolesArr = [];
      try { rolesArr = JSON.parse(opt.support_roles || '[]'); } catch (e) {}
      let pingsArr = [];
      try { pingsArr = JSON.parse(opt.ping_users || '[]'); } catch (e) {}

      let rolesText = rolesArr.map(rid => `@${getRoleName(rid)}`).join(', ') || 'Aucun rôle';
      let pingsText = pingsArr.map(uid => {
        const u = membersList.find(m => m.id === uid);
        return u ? u.displayName : uid;
      }).join(', ') || 'Aucun membre';

      tdSupport.innerHTML = `<strong>Staff:</strong> ${rolesText}<br><small style="color: #b9bbbe;"><strong>Pings:</strong> ${pingsText}</small>`;

      // Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      tdActions.style.display = 'flex';
      tdActions.style.gap = '5px';
      tdActions.style.justifyContent = 'center';

      // Edit Button
      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-delete-gif';
      btnEdit.style.background = '#3498db';
      btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
      btnEdit.title = 'Modifier cette catégorie';
      btnEdit.addEventListener('click', () => {
        // Remplir le formulaire avec les valeurs existantes
        document.getElementById('ticket_opt_id').value = opt.id || '';
        document.getElementById('ticket_opt_label').value = opt.label || '';
        document.getElementById('ticket_opt_value').value = opt.value || '';
        document.getElementById('ticket_opt_emoji').value = opt.emoji || '';
        document.getElementById('ticket_opt_style').value = opt.button_style || 'Primary';
        document.getElementById('ticket_opt_category').value = opt.category_id || '';
        document.getElementById('ticket_opt_view_role').value = opt.required_role_id || '';
        document.getElementById('ticket_opt_description').value = opt.description || '';
        document.getElementById('ticket_opt_image_url').value = opt.image_url || '';
        document.getElementById('ticket_opt_show_member').checked = opt.show_member_button !== 0;
        document.getElementById('ticket_opt_show_certify').checked = opt.show_certify_button !== 0;
        document.getElementById('ticket_opt_require_age_verification').checked = opt.require_age_verification === 1;
        document.getElementById('ticket_opt_min_age_required').value = opt.min_age_required || 18;
        document.getElementById('ticket_opt_age_verified_role_id').value = opt.age_verified_role_id || '';
        document.getElementById('ticket_opt_age_verification_log_channel').value = opt.age_verification_log_channel || '';

        // Rôles support
        let sRoles = [];
        try { sRoles = JSON.parse(opt.support_roles || '[]'); } catch (e) {}
        const supportSelect = document.getElementById('ticket_opt_support_roles');
        Array.from(supportSelect.options).forEach(option => {
          option.selected = sRoles.includes(option.value);
        });

        // Membres à ping
        let pUsers = [];
        try { pUsers = JSON.parse(opt.ping_users || '[]'); } catch (e) {}
        const pingSelect = document.getElementById('ticket_opt_ping_users');
        Array.from(pingSelect.options).forEach(option => {
          option.selected = pUsers.includes(option.value);
        });

        // Bouton Membre Roles à ajouter
        let mRolesAdd = [];
        try { mRolesAdd = JSON.parse(opt.member_roles_add || '[]'); } catch (e) {}
        const memberAddSelect = document.getElementById('ticket_opt_member_roles_add');
        if (memberAddSelect) {
          Array.from(memberAddSelect.options).forEach(option => {
            option.selected = mRolesAdd.includes(option.value);
          });
        }

        // Bouton Membre Roles à retirer
        let mRolesRemove = [];
        try { mRolesRemove = JSON.parse(opt.member_roles_remove || '[]'); } catch (e) {}
        const memberRemoveSelect = document.getElementById('ticket_opt_member_roles_remove');
        if (memberRemoveSelect) {
          Array.from(memberRemoveSelect.options).forEach(option => {
            option.selected = mRolesRemove.includes(option.value);
          });
        }

        // Bouton Certifier Roles à ajouter
        let cRolesAdd = [];
        try { cRolesAdd = JSON.parse(opt.certify_roles_add || '[]'); } catch (e) {}
        const certifyAddSelect = document.getElementById('ticket_opt_certify_roles_add');
        if (certifyAddSelect) {
          Array.from(certifyAddSelect.options).forEach(option => {
            option.selected = cRolesAdd.includes(option.value);
          });
        }

        // Bouton Certifier Roles à retirer
        let cRolesRemove = [];
        try { cRolesRemove = JSON.parse(opt.certify_roles_remove || '[]'); } catch (e) {}
        const certifyRemoveSelect = document.getElementById('ticket_opt_certify_roles_remove');
        if (certifyRemoveSelect) {
          Array.from(certifyRemoveSelect.options).forEach(option => {
            option.selected = cRolesRemove.includes(option.value);
          });
        }

        // Synchroniser les custom selects du formulaire
        ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users', 'ticket_opt_member_roles_add', 'ticket_opt_member_roles_remove', 'ticket_opt_certify_roles_add', 'ticket_opt_certify_roles_remove', 'ticket_opt_age_verified_role_id', 'ticket_opt_age_verification_log_channel'].forEach(id => {
          const selectEl = document.getElementById(id);
          if (selectEl && selectEl.syncCustomSelect) {
            selectEl.syncCustomSelect();
          }
        });

        // Changer le titre et le bouton pour indiquer la modification
        document.getElementById('ticket-opt-form-title').textContent = '📝 Modifier la catégorie de ticket';
        document.getElementById('btn-ticket-submit').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications';
        document.getElementById('btn-ticket-cancel-edit').style.display = 'block';

        // Scroll vers le formulaire
        document.getElementById('ticket-opt-form-title').scrollIntoView({ behavior: 'smooth' });
      });
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-gif';
      btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
      btnDel.addEventListener('click', () => {
        if (!confirm(`Supprimer cette catégorie de ticket "${opt.label}" ?`)) return;
        fetch('/api/config/tickets/options/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: opt.id })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('Catégorie de ticket supprimée !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        })
        .catch(err => showToast('Erreur: ' + err.message, true));
      });
      tdActions.appendChild(btnDel);

      row.appendChild(tdLabel);
      row.appendChild(tdStyle);
      row.appendChild(tdCategory);
      row.appendChild(tdReqRole);
      row.appendChild(tdSupport);
      row.appendChild(tdActions);

      ticketOptionsList.appendChild(row);
    });
  }

  function updateTicketPreview(panel, options) {
    const titleEl = document.getElementById('ticket-preview-title');
    const descEl = document.getElementById('ticket-preview-desc');
    const embedEl = document.getElementById('ticket-preview-embed');
    const thumbImgEl = document.getElementById('ticket-preview-thumb-img');
    const compsEl = document.getElementById('ticket-preview-components');

    titleEl.textContent = panel.title || '🎫 Support / Tickets';
    descEl.textContent = panel.description || 'Sélectionnez ou cliquez sur le bouton correspondant pour ouvrir un ticket d\'assistance.';
    embedEl.style.borderLeftColor = panel.color || '#5865F2';

    // Thumbnail
    if (panel.thumbnail && guildSelect.value) {
      const selectedOpt = guildSelect.options[guildSelect.selectedIndex];
      const iconHash = selectedOpt?.dataset?.icon;
      const guildId = guildSelect.value;
      if (iconHash && iconHash !== 'null') {
        thumbImgEl.src = `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.png`;
        thumbImgEl.style.display = 'block';
      } else {
        thumbImgEl.src = 'https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png';
        thumbImgEl.style.display = 'block';
      }
    } else {
      thumbImgEl.style.display = 'none';
    }

    // Image / GIF Preview
    const previewImageEl = document.getElementById('ticket-preview-image');
    if (panel.image_url) {
      previewImageEl.src = panel.image_url;
      previewImageEl.style.display = 'block';
    } else {
      previewImageEl.style.display = 'none';
    }

    // Components Preview
    compsEl.innerHTML = '';
    if (options.length === 0) {
      compsEl.innerHTML = '<div style="color:#72767d;font-style:italic;font-size:0.9rem;">Aucun bouton ou sélecteur (créez d\'abord des options)</div>';
      return;
    }

    if (panel.selector_type === 'buttons') {
      const flexContainer = document.createElement('div');
      flexContainer.style.display = 'flex';
      flexContainer.style.flexWrap = 'wrap';
      flexContainer.style.gap = '8px';

      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.style.padding = '6px 16px';
        btn.style.borderRadius = '4px';
        btn.style.border = 'none';
        btn.style.color = '#fff';
        btn.style.fontWeight = '500';
        btn.style.fontSize = '0.9rem';
        btn.style.cursor = 'default';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.gap = '6px';

        let bg = '#5865F2';
        if (opt.button_style === 'Secondary') bg = '#4f545c';
        if (opt.button_style === 'Success') bg = '#43b581';
        if (opt.button_style === 'Danger') bg = '#f04747';

        btn.style.backgroundColor = bg;
        
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = opt.emoji || '';
        const labelSpan = document.createElement('span');
        labelSpan.textContent = opt.label;

        if (opt.emoji) btn.appendChild(emojiSpan);
        btn.appendChild(labelSpan);

        flexContainer.appendChild(btn);
      });
      compsEl.appendChild(flexContainer);
    } else if (panel.selector_type === 'single_button') {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.padding = '8px 20px';
      btn.style.borderRadius = '4px';
      btn.style.border = 'none';
      btn.style.color = '#fff';
      btn.style.fontWeight = '500';
      btn.style.fontSize = '0.95rem';
      btn.style.cursor = 'default';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
      btn.style.backgroundColor = '#5865F2';
      
      const labelSpan = document.createElement('span');
      labelSpan.textContent = '🎫 Ouvrir un ticket';
      btn.appendChild(labelSpan);
      compsEl.appendChild(btn);
    } else {
      const selectMenu = document.createElement('div');
      selectMenu.style.width = '100%';
      selectMenu.style.padding = '10px 12px';
      selectMenu.style.borderRadius = '4px';
      selectMenu.style.background = '#2f3136';
      selectMenu.style.border = '1px solid rgba(255,255,255,0.08)';
      selectMenu.style.color = '#dcddde';
      selectMenu.style.fontSize = '0.9rem';
      selectMenu.style.display = 'flex';
      selectMenu.style.justifyContent = 'space-between';
      selectMenu.style.alignItems = 'center';
      
      selectMenu.innerHTML = `
        <span>Sélectionnez une catégorie pour ouvrir un ticket...</span>
        <i class="fa-solid fa-chevron-down" style="font-size:0.8rem;color:#72767d;"></i>
      `;
      compsEl.appendChild(selectMenu);
    }
  }

  // 7. Jeu du Mot Caché
  formGame.addEventListener('submit', (e) => {
    e.preventDefault();
    const selectedChannels = Array.from(document.querySelectorAll('.game-allowed-channel-cb:checked')).map(cb => cb.value);
    const data = {
      is_active: document.getElementById('game_is_active').checked,
      secret_phrase: document.getElementById('game_secret_phrase').value,
      reward_money: parseInt(document.getElementById('game_reward_money').value) || 0,
      reward_xp: parseInt(document.getElementById('game_reward_xp').value) || 0,
      reward_chance: parseInt(document.getElementById('game_reward_chance')?.value || '0') || 0,
      reward_role_id: document.getElementById('game_reward_role_id').value || null,
      appearance_chance: parseFloat(document.getElementById('game_appearance_chance').value) ?? 15,
      letter_emoji: document.getElementById('game_letter_emoji').value || '🔍',
      announce_channel: document.getElementById('game_announce_channel').value || '',
      ephemeral_letters: document.getElementById('game_ephemeral_letters').checked,
      reset_progress: document.getElementById('game_reset_progress').checked,
      allowed_channels: selectedChannels
    };

    fetch('/api/config/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('Configuration du jeu enregistrée !');
        document.getElementById('game_reset_progress').checked = false;
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // Karma & Récompenses
  formKarma.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      is_active: document.getElementById('karma_is_active').checked,
      announce_rewards: document.getElementById('karma_announce_rewards').checked,
      threshold_1: parseInt(document.getElementById('karma_threshold_1').value) || 20,
      xp_mult_1: parseFloat(document.getElementById('karma_xp_mult_1').value) || 1.2,
      discount_1: parseFloat(document.getElementById('karma_discount_1').value) || 5,
      threshold_2: parseInt(document.getElementById('karma_threshold_2').value) || 50,
      xp_mult_2: parseFloat(document.getElementById('karma_xp_mult_2').value) || 1.5,
      discount_2: parseFloat(document.getElementById('karma_discount_2').value) || 10,
      threshold_3: parseInt(document.getElementById('karma_threshold_3').value) || 100,
      xp_mult_3: parseFloat(document.getElementById('karma_xp_mult_3').value) || 2.0,
      discount_3: parseFloat(document.getElementById('karma_discount_3').value) || 20
    };

    fetch('/api/config/karma', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('Configuration du Karma enregistrée !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // Rappel de Bumps
  if (formBump) {
    formBump.addEventListener('submit', (e) => {
      e.preventDefault();
      const reminder_channel = document.getElementById('bump_reminder_channel').value || null;
      const reminder_role = document.getElementById('bump_reminder_role').value || null;

      fetch('/api/config/bump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_channel, reminder_role })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Configuration des rappels de bump enregistrée !');
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    });
  }

  // Formulaire Boost Config
  const formBoostConfig = document.getElementById('form-boost-config');
  if (formBoostConfig) {
    formBoostConfig.addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        enabled: document.getElementById('boost_enabled').checked ? 1 : 0,
        channel_id: document.getElementById('boost_channel').value,
        color: document.getElementById('boost_color').value,
        title: document.getElementById('boost_title').value,
        message: document.getElementById('boost_message').value,
        reward_money: parseInt(document.getElementById('boost_reward_money').value) || 0,
        reward_karma: parseInt(document.getElementById('boost_reward_karma').value) || 0,
        image_url: document.getElementById('boost_image_url').value
      };
      fetch('/api/config/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Configuration des remerciements de Boost enregistrée avec succès !');
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    });
  }

  // Formulaire Tribunal
  const formTribunal = document.getElementById('form-tribunal');
  if (formTribunal) {
    formTribunal.addEventListener('submit', (e) => {
      e.preventDefault();
      const category_id = document.getElementById('tribunal_category').value;
      const channel_prefix = document.getElementById('tribunal_channel_prefix').value || '⚖️┆procès-';
      const auto_delete_minutes = parseInt(document.getElementById('tribunal_auto_delete_minutes').value) || 5;

      const accessSelect = document.getElementById('tribunal_access_roles');
      const access_roles = accessSelect ? Array.from(accessSelect.selectedOptions).map(o => o.value) : [];

      const judge_role_id = document.getElementById('tribunal_judge_role').value;
      const lawyer_role_id = document.getElementById('tribunal_lawyer_role').value;
      const accused_role_id = document.getElementById('tribunal_accused_role').value;
      const plaintiff_role_id = document.getElementById('tribunal_plaintiff_role').value;

      fetch('/api/config/tribunal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id,
          channel_prefix,
          auto_delete_minutes,
          access_roles,
          judge_role_id,
          lawyer_role_id,
          accused_role_id,
          plaintiff_role_id
        })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Configuration du Tribunal enregistrée !');
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    });
  }

  // Formulaire Ajout / Modification de salon de Comptage
  const formAddCountingChannel = document.getElementById('form-add-counting-channel');
  if (formAddCountingChannel) {
    formAddCountingChannel.addEventListener('submit', (e) => {
      e.preventDefault();
      const channel_id = document.getElementById('counting-channel-select').value;
      const mode = document.getElementById('counting-mode-select').value;
      const start_number = parseFloat(document.getElementById('counting-start-number').value) || 0;
      const emoji_success = document.getElementById('counting-emoji-success').value || '✅';
      const emoji_error = document.getElementById('counting-emoji-error').value || '❌';
      const emoji_highscore = document.getElementById('counting-emoji-highscore').value || '🏆';
      const emoji_chance = document.getElementById('counting-emoji-chance').value || '🍀';

      fetch('/api/config/counting/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id,
          mode,
          start_number,
          emoji_success,
          emoji_error,
          emoji_highscore,
          emoji_chance
        })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Salon de comptage enregistré avec ses émojis !');
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    });
  }

  // Forums Illimités
  formForums.addEventListener('submit', (e) => {
    e.preventDefault();
    const checkedCheckboxes = document.querySelectorAll('.forum-checkbox:checked');
    const selectedOptions = Array.from(checkedCheckboxes).map(cb => cb.value);

    fetch('/api/config/unlimited-forums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels: selectedOptions })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('Configuration des Forums enregistrée !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // 15. Formulaire des Permissions & Dérogations de Rôles
  if (formPermissions) {
    formPermissions.addEventListener('submit', (e) => {
      e.preventDefault();
      const getMultiValues = (id) => {
        const select = document.getElementById(id);
        if (!select) return [];
        return Array.from(select.selectedOptions).map(opt => opt.value);
      };

      const data = {
        admin_role_id: document.getElementById('perm_admin_role_id').value || null,
        modo_role_id: document.getElementById('perm_modo_role_id').value || null,
        dashboard_roles: getMultiValues('perm_dashboard_roles'),
        admin_cmds_roles: getMultiValues('perm_admin_cmds_roles'),
        modo_cmds_roles: getMultiValues('perm_modo_cmds_roles')
      };

      saveConfig('/api/config/permissions', data);
    });
  }

  // Filtrage de la liste d'Action ou Vérité
  const filterActionVerite = document.getElementById('filter-action-verite');
  if (filterActionVerite) {
    filterActionVerite.addEventListener('change', (e) => {
      const val = e.target.value;
      let filtered = [...currentActionVeriteItems];
      if (val === 'action_sfw') {
        filtered = filtered.filter(item => item.type === 'action' && item.category === 'sfw');
      } else if (val === 'verite_sfw') {
        filtered = filtered.filter(item => item.type === 'verite' && item.category === 'sfw');
      } else if (val === 'action_nsfw') {
        filtered = filtered.filter(item => item.type === 'action' && item.category === 'nsfw');
      } else if (val === 'verite_nsfw') {
        filtered = filtered.filter(item => item.type === 'verite' && item.category === 'nsfw');
      }
      renderActionVeriteTableOnly(filtered);
    });
  }

  // Salons Action ou Vérité
  formActionVeriteChannels.addEventListener('submit', (e) => {
    e.preventDefault();
    const sfw_channel_id = document.getElementById('av_sfw_channel').value;
    const nsfw_channel_id = document.getElementById('av_nsfw_channel').value;

    fetch('/api/config/action-verite/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sfw_channel_id, nsfw_channel_id })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('Configuration des salons enregistrée !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // Action ou Vérité
  formAddActionVerite.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('av_type').value;
    const category = document.getElementById('av_category').value;
    const content = document.getElementById('av_content').value;

    fetch('/api/config/action-verite/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, category, content })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('Ajouté avec succès !');
        document.getElementById('av_content').value = '';
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // --- SYSTÈME DE TICKETS MULTI-PANNEAUX ---
  let currentTicketPanels = [];
  let currentTicketOptions = [];

  function renderTicketPanelsList(panels, options) {
    const tbody = document.getElementById('ticket-panels-list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (panels.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#8e9297; padding: 15px; font-style: italic;">Aucun panneau configuré. Créez-en un avec le formulaire ci-dessous.</td></tr>';
      return;
    }

    panels.forEach(p => {
      const tr = document.createElement('tr');

      const tdTitle = document.createElement('td');
      tdTitle.innerHTML = `<strong>${p.title || '🎫 Support'}</strong>`;

      const tdChannel = document.createElement('td');
      const chanName = p.channel_id ? (getChannelName(p.channel_id) || `<#${p.channel_id}>`) : 'Non configuré';
      tdChannel.innerHTML = `<span style="color:#7289da;"><i class="fa-solid fa-hashtag"></i> ${chanName}</span>`;

      const tdType = document.createElement('td');
      let typeText = 'Menu déroulant 💬';
      if (p.selector_type === 'buttons') typeText = 'Boutons 🔘';
      if (p.selector_type === 'single_button') typeText = 'Bouton Unique 🎫';
      tdType.textContent = typeText;

      const tdCats = document.createElement('td');
      let allowedArr = [];
      try { allowedArr = JSON.parse(p.allowed_options || '[]'); } catch (e) {}
      if (!allowedArr || allowedArr.length === 0) {
        tdCats.innerHTML = '<span style="color:#2ecc71;">Toutes (Par défaut)</span>';
      } else {
        const labels = allowedArr.map(val => {
          const o = options.find(opt => opt.value === val);
          return o ? o.label : val;
        }).join(', ');
        tdCats.textContent = labels;
      }

      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      tdActions.style.display = 'flex';
      tdActions.style.gap = '5px';
      tdActions.style.justifyContent = 'center';

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-delete-gif';
      btnEdit.style.background = '#3498db';
      btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
      btnEdit.title = 'Modifier ce panneau';
      btnEdit.addEventListener('click', () => {
        loadPanelIntoForm(p, options);
      });

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-gif';
      btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
      btnDel.title = 'Supprimer ce panneau';
      btnDel.addEventListener('click', () => {
        if (!confirm(`Supprimer le panneau "${p.title}" ?\nLe message sur Discord sera également supprimé si présent.`)) return;
        fetch('/api/config/tickets/panel/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: p.id })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('Panneau supprimé !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        })
        .catch(err => showToast('Erreur: ' + err.message, true));
      });

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdTitle);
      tr.appendChild(tdChannel);
      tr.appendChild(tdType);
      tr.appendChild(tdCats);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  function renderAllowedOptionsCheckboxes(options, selectedAllowed = []) {
    const container = document.getElementById('ticket_panel_allowed_options_container');
    if (!container) return;
    container.innerHTML = '';
    if (options.length === 0) {
      container.innerHTML = '<span style="color:#8e9297;font-style:italic;">Aucune catégorie de ticket configurée sur le serveur.</span>';
      return;
    }
    options.forEach(opt => {
      const label = document.createElement('label');
      label.style.display = 'inline-flex';
      label.style.alignItems = 'center';
      label.style.gap = '6px';
      label.style.background = 'rgba(255,255,255,0.05)';
      label.style.padding = '4px 10px';
      label.style.borderRadius = '4px';
      label.style.cursor = 'pointer';
      label.style.fontSize = '0.85rem';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'panel-allowed-option-cb';
      cb.value = opt.value;
      cb.checked = selectedAllowed.length === 0 || selectedAllowed.includes(opt.value);

      cb.addEventListener('change', () => {
        updateLiveTicketPreviewFromForm();
      });

      label.appendChild(cb);
      label.appendChild(document.createTextNode((opt.emoji ? opt.emoji + ' ' : '') + opt.label));
      container.appendChild(label);
    });
  }

  function loadPanelIntoForm(p, options) {
    document.getElementById('ticket_panel_id').value = p.id || '';
    document.getElementById('ticket_panel_title').value = p.title || '';
    document.getElementById('ticket_panel_desc').value = p.description || '';
    document.getElementById('ticket_panel_color').value = p.color || '#5865f2';
    document.getElementById('ticket_panel_selector').value = p.selector_type || 'select';
    document.getElementById('ticket_panel_channel').value = p.channel_id || '';
    document.getElementById('ticket_panel_thumbnail').checked = !!p.thumbnail;
    document.getElementById('ticket_panel_image_url').value = p.image_url || '';

    const titleEl = document.getElementById('ticket-panel-form-title');
    if (titleEl) titleEl.innerHTML = `✏️ Modifier le Panneau (ID: ${p.id})`;
    const btnCancel = document.getElementById('btn-cancel-ticket-panel');
    if (btnCancel) btnCancel.style.display = 'inline-block';

    const channelSel = document.getElementById('ticket_panel_channel');
    const selectorSel = document.getElementById('ticket_panel_selector');
    if (channelSel.syncCustomSelect) channelSel.syncCustomSelect();
    if (selectorSel.syncCustomSelect) selectorSel.syncCustomSelect();

    let allowedArr = [];
    try {
      if (p.allowed_options && p.allowed_options !== '[]') {
        allowedArr = JSON.parse(p.allowed_options);
      } else {
        allowedArr = options.map(o => o.value);
      }
    } catch (e) {
      allowedArr = options.map(o => o.value);
    }
    renderAllowedOptionsCheckboxes(options, allowedArr);

    updateLiveTicketPreviewFromForm();
  }

  function resetPanelForm(options) {
    document.getElementById('ticket_panel_id').value = '';
    document.getElementById('ticket_panel_title').value = '🎫 Support / Tickets';
    document.getElementById('ticket_panel_desc').value = 'Sélectionnez ou cliquez sur le bouton correspondant pour ouvrir un ticket d\'assistance.';
    document.getElementById('ticket_panel_color').value = '#5865f2';
    document.getElementById('ticket_panel_selector').value = 'select';
    document.getElementById('ticket_panel_channel').value = '';
    document.getElementById('ticket_panel_thumbnail').checked = true;
    document.getElementById('ticket_panel_image_url').value = '';

    const titleEl = document.getElementById('ticket-panel-form-title');
    if (titleEl) titleEl.innerHTML = '🎨 Nouveau Panneau de Ticket';
    const btnCancel = document.getElementById('btn-cancel-ticket-panel');
    if (btnCancel) btnCancel.style.display = 'none';

    const channelSel = document.getElementById('ticket_panel_channel');
    const selectorSel = document.getElementById('ticket_panel_selector');
    if (channelSel.syncCustomSelect) channelSel.syncCustomSelect();
    if (selectorSel.syncCustomSelect) selectorSel.syncCustomSelect();

    renderAllowedOptionsCheckboxes(options, []);
    updateLiveTicketPreviewFromForm();
  }

  function updateLiveTicketPreviewFromForm() {
    const allowedCbs = document.querySelectorAll('.panel-allowed-option-cb:checked');
    const allCbs = document.querySelectorAll('.panel-allowed-option-cb');
    let allowedVals = [];
    if (allowedCbs.length > 0 && allowedCbs.length < allCbs.length) {
      allowedVals = Array.from(allowedCbs).map(cb => cb.value);
    }

    let filteredOpts = currentTicketOptions;
    if (allowedVals.length > 0) {
      filteredOpts = currentTicketOptions.filter(opt => allowedVals.includes(opt.value));
    }

    const panel = {
      title: document.getElementById('ticket_panel_title').value,
      description: document.getElementById('ticket_panel_desc').value,
      color: document.getElementById('ticket_panel_color').value,
      selector_type: document.getElementById('ticket_panel_selector').value,
      thumbnail: document.getElementById('ticket_panel_thumbnail').checked,
      image_url: document.getElementById('ticket_panel_image_url').value
    };

    updateTicketPreview(panel, filteredOpts);
  }

  const btnCreateNewPanel = document.getElementById('btn-create-new-ticket-panel');
  if (btnCreateNewPanel) {
    btnCreateNewPanel.addEventListener('click', () => {
      resetPanelForm(currentTicketOptions);
    });
  }

  const btnCancelPanel = document.getElementById('btn-cancel-ticket-panel');
  if (btnCancelPanel) {
    btnCancelPanel.addEventListener('click', () => {
      resetPanelForm(currentTicketOptions);
    });
  }

  // Live Preview Bindings for Ticket Panel
  ['ticket_panel_title', 'ticket_panel_desc', 'ticket_panel_color', 'ticket_panel_selector', 'ticket_panel_thumbnail', 'ticket_panel_image_url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventName = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        updateLiveTicketPreviewFromForm();
      });
    }
  });

  // Ticket Panel Submit
  formTicketPanel.addEventListener('submit', (e) => {
    e.preventDefault();
    const panelId = document.getElementById('ticket_panel_id').value;

    const allowedCbs = document.querySelectorAll('.panel-allowed-option-cb:checked');
    const allCbs = document.querySelectorAll('.panel-allowed-option-cb');
    let allowed_options = [];
    if (allowedCbs.length > 0 && allowedCbs.length < allCbs.length) {
      allowed_options = Array.from(allowedCbs).map(cb => cb.value);
    }

    const data = {
      id: panelId ? parseInt(panelId) : undefined,
      title: document.getElementById('ticket_panel_title').value,
      description: document.getElementById('ticket_panel_desc').value,
      color: document.getElementById('ticket_panel_color').value,
      selector_type: document.getElementById('ticket_panel_selector').value,
      channel_id: document.getElementById('ticket_panel_channel').value,
      thumbnail: document.getElementById('ticket_panel_thumbnail').checked ? 1 : 0,
      image_url: document.getElementById('ticket_panel_image_url').value,
      allowed_options
    };

    const url = panelId ? '/api/config/tickets/panel/update' : '/api/config/tickets/panel/add';

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        if (resData.warning) {
          showToast('Panel enregistré, mais attention : ' + resData.warning, true);
        } else {
          showToast('Panel de tickets enregistré et déployé avec succès !');
        }
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  formTicketOption.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const rolesSelect = document.getElementById('ticket_opt_support_roles');
    const support_roles = Array.from(rolesSelect.selectedOptions).map(opt => opt.value);

    const pingSelect = document.getElementById('ticket_opt_ping_users');
    const ping_users = Array.from(pingSelect.selectedOptions).map(opt => opt.value);

    const memberAddSel = document.getElementById('ticket_opt_member_roles_add');
    const member_roles_add = memberAddSel ? Array.from(memberAddSel.selectedOptions).map(opt => opt.value) : [];

    const memberRemoveSel = document.getElementById('ticket_opt_member_roles_remove');
    const member_roles_remove = memberRemoveSel ? Array.from(memberRemoveSel.selectedOptions).map(opt => opt.value) : [];

    const certifyAddSel = document.getElementById('ticket_opt_certify_roles_add');
    const certify_roles_add = certifyAddSel ? Array.from(certifyAddSel.selectedOptions).map(opt => opt.value) : [];

    const certifyRemoveSel = document.getElementById('ticket_opt_certify_roles_remove');
    const certify_roles_remove = certifyRemoveSel ? Array.from(certifyRemoveSel.selectedOptions).map(opt => opt.value) : [];

    const id = document.getElementById('ticket_opt_id').value;

    const data = {
      id: id || null,
      label: document.getElementById('ticket_opt_label').value,
      value: document.getElementById('ticket_opt_value').value,
      emoji: document.getElementById('ticket_opt_emoji').value,
      button_style: document.getElementById('ticket_opt_style').value,
      category_id: document.getElementById('ticket_opt_category').value,
      required_role_id: document.getElementById('ticket_opt_view_role').value,
      support_roles,
      ping_users,
      description: document.getElementById('ticket_opt_description').value || null,
      image_url: document.getElementById('ticket_opt_image_url').value || null,
      member_roles_add,
      member_roles_remove,
      certify_roles_add,
      certify_roles_remove,
      show_member_button: document.getElementById('ticket_opt_show_member').checked ? 1 : 0,
      show_certify_button: document.getElementById('ticket_opt_show_certify').checked ? 1 : 0,
      require_age_verification: document.getElementById('ticket_opt_require_age_verification').checked ? 1 : 0,
      min_age_required: parseInt(document.getElementById('ticket_opt_min_age_required').value) || 18,
      age_verified_role_id: document.getElementById('ticket_opt_age_verified_role_id').value || null,
      age_verification_log_channel: document.getElementById('ticket_opt_age_verification_log_channel').value || null
    };

    fetch('/api/config/tickets/options/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast(id ? 'Catégorie de ticket modifiée !' : 'Catégorie de ticket ajoutée !');
        
        // Réinitialiser le formulaire
        formTicketOption.reset();
        document.getElementById('ticket_opt_id').value = '';
        document.getElementById('ticket-opt-form-title').textContent = '➕ Ajouter une option de ticket';
        document.getElementById('btn-ticket-submit').innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter cette Catégorie';
        document.getElementById('btn-ticket-cancel-edit').style.display = 'none';

        // Synchroniser tous les custom selects pour réinitialisation
        ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users', 'ticket_opt_member_roles_add', 'ticket_opt_member_roles_remove', 'ticket_opt_certify_roles_add', 'ticket_opt_certify_roles_remove', 'ticket_opt_age_verified_role_id', 'ticket_opt_age_verification_log_channel'].forEach(selId => {
          const selectEl = document.getElementById(selId);
          if (selectEl && selectEl.syncCustomSelect) {
            selectEl.syncCustomSelect();
          }
        });

        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // Gérer le bouton Annuler la modification
  const btnTicketCancelEdit = document.getElementById('btn-ticket-cancel-edit');
  if (btnTicketCancelEdit) {
    btnTicketCancelEdit.addEventListener('click', () => {
      formTicketOption.reset();
      document.getElementById('ticket_opt_id').value = '';
      document.getElementById('ticket-opt-form-title').textContent = '➕ Ajouter une option de ticket';
      document.getElementById('btn-ticket-submit').innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter cette Catégorie';
      btnTicketCancelEdit.style.display = 'none';

      // Synchroniser tous les custom selects pour réinitialisation
      ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users', 'ticket_opt_member_roles_add', 'ticket_opt_member_roles_remove', 'ticket_opt_certify_roles_add', 'ticket_opt_certify_roles_remove', 'ticket_opt_age_verified_role_id', 'ticket_opt_age_verification_log_channel'].forEach(selId => {
        const selectEl = document.getElementById(selId);
        if (selectEl && selectEl.syncCustomSelect) {
          selectEl.syncCustomSelect();
        }
      });
    });
  }

  // Permissions Form Submit
  if (formPermissions) {
    formPermissions.addEventListener('submit', (e) => {
      e.preventDefault();
      const admin_role_id = document.getElementById('perm_admin_role_id').value;
      const modo_role_id = document.getElementById('perm_modo_role_id').value;

      const getMultiSelectValues = (id) => {
        const select = document.getElementById(id);
        if (!select) return [];
        return Array.from(select.selectedOptions).map(opt => opt.value);
      };

      const dashboard_roles = getMultiSelectValues('perm_dashboard_roles');
      const admin_cmds_roles = getMultiSelectValues('perm_admin_cmds_roles');
      const modo_cmds_roles = getMultiSelectValues('perm_modo_cmds_roles');

      saveConfig('/api/config/permissions', { 
        admin_role_id, 
        modo_role_id,
        dashboard_roles,
        admin_cmds_roles,
        modo_cmds_roles
      });
    });
  }

  function updatePermissionsRoleBadges() {
    const getRoleName = (roleId) => {
      const roleObj = rolesListState.find(r => r.id === roleId);
      return roleObj ? roleObj.name : `Rôle ID: ${roleId}`;
    };

    // 1. Rôle Admin
    const adminSel = document.getElementById('perm_admin_role_id');
    const adminBadgeContainer = document.getElementById('badge_admin_role_id');
    if (adminSel && adminBadgeContainer) {
      const val = adminSel.value;
      if (val) {
        adminBadgeContainer.innerHTML = `<span style="background: rgba(241, 196, 15, 0.2); border: 1px solid #f1c40f; color: #f1c40f; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-crown"></i> ${getRoleName(val)}</span>`;
      } else {
        adminBadgeContainer.innerHTML = `<span style="color: #8e9297; font-style: italic; font-size: 0.83rem;">(Aucun rôle Administrateur sélectionné)</span>`;
      }
    }

    // 2. Rôle Modo
    const modoSel = document.getElementById('perm_modo_role_id');
    const modoBadgeContainer = document.getElementById('badge_modo_role_id');
    if (modoSel && modoBadgeContainer) {
      const val = modoSel.value;
      if (val) {
        modoBadgeContainer.innerHTML = `<span style="background: rgba(231, 76, 60, 0.2); border: 1px solid #e74c3c; color: #e74c3c; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-shield-halved"></i> ${getRoleName(val)}</span>`;
      } else {
        modoBadgeContainer.innerHTML = `<span style="color: #8e9297; font-style: italic; font-size: 0.83rem;">(Aucun rôle Modérateur sélectionné)</span>`;
      }
    }

    // 3. Multi-sélecteurs
    const renderMultiBadges = (selectId, containerId, badgeColor) => {
      const sel = document.getElementById(selectId);
      const container = document.getElementById(containerId);
      if (!sel || !container) return;
      const selectedOpts = Array.from(sel.selectedOptions).filter(opt => opt.value);
      if (selectedOpts.length === 0) {
        container.innerHTML = `<span style="color: #8e9297; font-style: italic; font-size: 0.83rem;">(Aucun rôle dérivé configuré)</span>`;
        return;
      }
      container.innerHTML = selectedOpts.map(opt => 
        `<span style="background: ${badgeColor}22; border: 1px solid ${badgeColor}; color: ${badgeColor}; padding: 4px 12px; border-radius: 12px; font-weight: 600; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 6px;"><i class="fa-solid fa-user-tag"></i> ${opt.textContent || getRoleName(opt.value)}</span>`
      ).join('');
    };

    renderMultiBadges('perm_dashboard_roles', 'badges_dashboard_roles', '#3498db');
    renderMultiBadges('perm_admin_cmds_roles', 'badges_admin_cmds_roles', '#f1c40f');
    renderMultiBadges('perm_modo_cmds_roles', 'badges_modo_cmds_roles', '#e74c3c');
  }

  // Écouteurs de changement pour mettre à jour les badges de rôles en direct
  ['perm_admin_role_id', 'perm_modo_role_id', 'perm_dashboard_roles', 'perm_admin_cmds_roles', 'perm_modo_cmds_roles'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', updatePermissionsRoleBadges);
    }
  });

  // 3. Quarantaine
  formQuarantine.addEventListener('submit', (e) => {
    e.preventDefault();
    const role_id = document.getElementById('quarantine_role').value;
    const channel_id = document.getElementById('quarantine_channel').value;
    saveConfig('/api/config/quarantine', { role_id, channel_id });
  });


  // Shop Settings Form Submit (Suites privées category & prefix)
  const formShopSettings = document.getElementById('form-shop-settings');
  if (formShopSettings) {
    formShopSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      const private_suite_category_id = document.getElementById('private_suite_category_id').value;
      const suite_channel_prefix = document.getElementById('suite_channel_prefix').value;
      saveConfig('/api/config/shop-settings', { private_suite_category_id, suite_channel_prefix });
    });
  }

  // Bouton de resynchronisation manuelle des salons
  const btnSyncSuite = document.getElementById('btn-sync-suite-channels');
  if (btnSyncSuite) {
    btnSyncSuite.addEventListener('click', () => {
      btnSyncSuite.disabled = true;
      btnSyncSuite.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resynchronisation...';
      fetch('/api/config/sync-channels', { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          btnSyncSuite.disabled = false;
          btnSyncSuite.innerHTML = '<i class="fa-solid fa-rotate"></i> Resynchroniser les salons existants';
          if (data.success) {
            showToast('Noms des salons suites et tribunal resynchronisés avec succès !');
          } else {
            showToast('Erreur: ' + data.error, true);
          }
        })
        .catch(err => {
          btnSyncSuite.disabled = false;
          btnSyncSuite.innerHTML = '<i class="fa-solid fa-rotate"></i> Resynchroniser les salons existants';
          showToast('Erreur: ' + err.message, true);
        });
    });
  }

  // 4. Logs
  formLogs.addEventListener('submit', (e) => {
    e.preventDefault();
    const categories = ['messages', 'members', 'voice', 'moderation', 'structure', 'bots', 'tickets', 'pseudo', 'roles', 'confessions'];
    const channelMap = {};
    const checkedEvents = [];

    categories.forEach(cat => {
      const enableCb = document.getElementById(`log_enable_${cat}`);
      const channelSel = document.getElementById(`log_channel_${cat}`);
      if (enableCb && enableCb.checked) {
        checkedEvents.push(cat);
      }
      if (channelSel) {
        channelMap[cat] = channelSel.value || '';
      }
    });

    const channel_id = JSON.stringify(channelMap);
    const events = checkedEvents.length === 0 ? 'none' : checkedEvents.join(',');
    saveConfig('/api/config/logs', { channel_id, events });
  });

  // 5. Leveling Settings
  formLevelingSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      xp_min: parseInt(document.getElementById('xp_min').value),
      xp_max: parseInt(document.getElementById('xp_max').value),
      xp_base: parseInt(document.getElementById('xp_base').value) || 120,
      xp_factor: parseFloat(document.getElementById('xp_factor').value) || 1.35,
      karma_min: parseInt(document.getElementById('karma_min').value),
      karma_max: parseInt(document.getElementById('karma_max').value),
      money_min: parseInt(document.getElementById('money_min').value),
      money_max: parseInt(document.getElementById('money_max').value),
      nsfw_xp_reward: parseInt(document.getElementById('nsfw_xp_reward').value) || 0,
      nsfw_money_reward: parseInt(document.getElementById('nsfw_money_reward').value) || 0,
      announce_channel: document.getElementById('announce_channel').value,
      announce_msg: document.getElementById('announce_msg').value
    };
    saveConfig('/api/config/leveling', data);
  });

  const formKarmaSettings = document.getElementById('form-karma-settings');
  if (formKarmaSettings) {
    formKarmaSettings.addEventListener('submit', (e) => {
      e.preventDefault();
      const min_karma = parseInt(document.getElementById('karma_setting_min').value) || 1;
      const max_karma = parseInt(document.getElementById('karma_setting_max').value) || 3;
      saveConfig('/api/config/karma', { min_karma, max_karma });
    });
  }

  // --- ACTION REWARDS MANAGER ---
  const actionRewardsList = document.getElementById('action-rewards-list');

  if (formActionRewards) {
    formActionRewards.addEventListener('submit', (e) => {
      e.preventDefault();
      const action_name = document.getElementById('reward_action_name').value;
      const min_money = parseInt(document.getElementById('reward_min_money').value) || 0;
      const max_money = parseInt(document.getElementById('reward_max_money').value) || 0;
      const min_karma = parseInt(document.getElementById('reward_min_karma').value) || 0;
      const max_karma = parseInt(document.getElementById('reward_max_karma').value) || 0;

      fetch('/api/config/action-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_name, min_money, max_money, min_karma, max_karma })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast(`Récompenses enregistrées pour /${action_name} !`);
            fetchAndRenderActionRewards();
          } else {
            showToast('Erreur: ' + (data.error || 'inconnue'), true);
          }
        })
        .catch(err => showToast(err.message, true));
    });
  }

  function fetchAndRenderActionRewards() {
    fetch('/api/config/action-rewards')
      .then(res => res.json())
      .then(rewards => {
        renderActionRewards(rewards);
      })
      .catch(console.error);
  }

  function renderActionRewards(rewards) {
    if (!actionRewardsList) return;
    if (!rewards || rewards.length === 0) {
      actionRewardsList.innerHTML = '<tr><td colspan="4" class="text-center">Aucune personnalisation spécifique. (Gains par défaut : 5-15 pièces, 1-3 karma)</td></tr>';
      return;
    }

    actionRewardsList.innerHTML = '';
    rewards.forEach(rew => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>/${rew.action_name}</strong></td>
        <td>💰 <strong>${rew.min_money}</strong> à <strong>${rew.max_money}</strong> pièces</td>
        <td>✨ <strong>${rew.min_karma}</strong> à <strong>${rew.max_karma}</strong> karma</td>
        <td><button class="btn btn-danger btn-delete-action-reward" data-action="${rew.action_name}"><i class="fa-solid fa-trash-can"></i> Réinitialiser</button></td>
      `;

      tr.querySelector('.btn-delete-action-reward').addEventListener('click', () => {
        deleteActionReward(rew.action_name);
      });

      actionRewardsList.appendChild(tr);
    });
  }

  function deleteActionReward(action_name) {
    if (!confirm(`Voulez-vous réinitialiser les gains par défaut pour /${action_name} ?`)) return;

    fetch('/api/config/action-rewards/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_name })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`Action /${action_name} réinitialisée aux valeurs par défaut !`);
          fetchAndRenderActionRewards();
        }
      })
      .catch(console.error);
  }

  // Réinitialisation des messages NSFW (FEU)
  document.getElementById('btn-reset-nsfw').addEventListener('click', () => {
    if (!confirm('Voulez-vous vraiment réinitialiser les compteurs FEU (NSFW) de TOUS les membres sur ce serveur ?')) return;

    fetch('/api/config/leveling/reset-nsfw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Compteurs FEU réinitialisés avec succès !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
  });

  // 5b. Automod Settings
  formAutomod.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      anti_link: document.getElementById('automod_anti_link').checked ? 1 : 0,
      anti_spam: document.getElementById('automod_anti_spam').checked ? 1 : 0,
      anti_massmention: document.getElementById('automod_anti_massmention').checked ? 1 : 0,
      anti_badwords: document.getElementById('automod_anti_badwords').checked ? 1 : 0,
      spam_max_msgs: parseInt(document.getElementById('automod_spam_max_msgs').value) || 5,
      massmention_limit: parseInt(document.getElementById('automod_massmention_limit').value) || 5,
      badwords_list: document.getElementById('automod_badwords_list').value,
      bypass_roles: document.getElementById('automod_bypass_roles').value
    };
    saveConfig('/api/config/automod', data);
  });

  // Helper Save function
  function saveConfig(endpoint, data) {
    const selectedGuild = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    const bodyData = (typeof data === 'object' && data !== null) ? { ...data } : {};
    if (selectedGuild && !bodyData.guildId) {
      bodyData.guildId = selectedGuild;
    }
    const targetUrl = selectedGuild 
      ? (endpoint.includes('?') ? `${endpoint}&guildId=${selectedGuild}` : `${endpoint}?guildId=${selectedGuild}`) 
      : endpoint;

    fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Configuration enregistrée avec succès !');
        } else {
          showToast('Erreur: ' + (resData.error || 'inconnue'), true);
        }
      })
      .catch(err => showToast('Erreur serveur: ' + err.message, true));
  }

  // --- SHOP MANAGER ---

  // Gestion de l'affichage de la durée du rôle temporaire
  const roleTypeSelect = document.getElementById('shop_item_role_type');
  const durationRow = document.getElementById('shop_item_duration_row');
  if (roleTypeSelect && durationRow) {
    roleTypeSelect.addEventListener('change', () => {
      durationRow.style.display = roleTypeSelect.value === 'temporary' ? 'flex' : 'none';
    });
  }

  formAddShopItem.addEventListener('submit', (e) => {
    e.preventDefault();

    let roleDurationMs = 0;
    const roleType = document.getElementById('shop_item_role_type').value;
    if (roleType === 'temporary') {
      const val = parseInt(document.getElementById('shop_item_duration_val').value) || 0;
      const unit = document.getElementById('shop_item_duration_unit').value;
      if (val > 0) {
        if (unit === 'days') roleDurationMs = val * 24 * 60 * 60 * 1000;
        else if (unit === 'hours') roleDurationMs = val * 60 * 60 * 1000;
        else if (unit === 'minutes') roleDurationMs = val * 60 * 1000;
      }
    }

    const data = {
      item_name: document.getElementById('shop_item_name').value,
      price: parseInt(document.getElementById('shop_item_price').value),
      description: document.getElementById('shop_item_desc').value,
      role_id: document.getElementById('shop_item_role').value || null,
      role_duration_ms: roleDurationMs,
      reward_xp: parseInt(document.getElementById('shop_item_xp').value) || 0,
      reward_karma: parseInt(document.getElementById('shop_item_karma').value) || 0
    };

    fetch('/api/config/shop/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          formAddShopItem.reset();
          if (durationRow) durationRow.style.display = 'none';
          // Reload configuration to refresh lists
          loadGuildConfiguration();
          showToast('Objet ajouté à la boutique !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
  });

  function renderShopItems(items) {
    if (items.length === 0) {
      shopItemsList.innerHTML = '<tr><td colspan="5" class="text-center">Aucun objet en vente pour le moment.</td></tr>';
      return;
    }

    shopItemsList.innerHTML = '';
    items.forEach(item => {
      const tr = document.createElement('tr');
      
      let roleDetails = 'Aucun';
      if (item.role_id) {
        const foundName = rolesList.find(r => r.id === item.role_id)?.name || `<@&${item.role_id}>`;
        if (item.role_duration_ms > 0) {
          const durationMins = Math.round(item.role_duration_ms / 60000);
          let durationStr = `${durationMins}m`;
          if (durationMins >= 1440) {
            durationStr = `${Math.round(durationMins / 1440)}j`;
          } else if (durationMins >= 60) {
            durationStr = `${Math.round(durationMins / 60)}h`;
          }
          roleDetails = `<span class="role-badge">${foundName}</span> <span style="font-size: 0.8rem; color: #f1c40f; font-weight: bold; margin-left: 5px;">⏱️ ${durationStr}</span>`;
        } else {
          roleDetails = `<span class="role-badge">${foundName}</span> <span style="font-size: 0.8rem; color: #2ecc71; font-weight: bold; margin-left: 5px;">♾️ Perm</span>`;
        }
      }

      let bonuses = [];
      if (item.reward_xp > 0) bonuses.push(`⭐ +${item.reward_xp} XP`);
      if (item.reward_karma > 0) bonuses.push(`✨ +${item.reward_karma} Karma`);
      const bonusText = bonuses.length > 0 ? `<div style="font-size: 0.8rem; color: #2ecc71; font-weight: bold; margin-top: 4px; display: flex; gap: 8px;">${bonuses.join(' | ')}</div>` : '';

      const isSuite = item.item_name.toLowerCase().startsWith('suite privée');

      const priceHTML = `
        <div style="display: flex; align-items: center; gap: 5px;">
          <span>💰</span>
          <input type="number" class="inner-input shop-price-input" data-name="${item.item_name}" value="${item.price}" style="width: 90px; text-align: right; padding: 4px;">
          <button class="btn btn-primary btn-save-price" data-name="${item.item_name}" style="padding: 5px 8px; font-size: 0.8rem;" title="Enregistrer le prix"><i class="fa-solid fa-floppy-disk"></i></button>
        </div>
      `;

      const actionHTML = isSuite
        ? `<span class="badge-lock" style="color: var(--text-muted); font-size: 0.9rem; font-weight: 600;"><i class="fa-solid fa-lock"></i> Permanent</span>`
        : `<button class="btn btn-danger btn-delete-shop" data-name="${item.item_name}"><i class="fa-solid fa-trash-can"></i> Supprimer</button>`;

      tr.innerHTML = `
        <td><strong>${item.item_name}</strong>${bonusText}</td>
        <td>${priceHTML}</td>
        <td>${item.description || '—'}</td>
        <td>${roleDetails}</td>
        <td style="text-align: center; vertical-align: middle;">${actionHTML}</td>
      `;

      // Event listener pour sauvegarder le prix
      tr.querySelector('.btn-save-price').addEventListener('click', () => {
        const input = tr.querySelector('.shop-price-input');
        const newPrice = parseInt(input.value);
        updateShopItemPrice(item.item_name, newPrice);
      });

      // Event listener pour supprimer
      if (!isSuite) {
        tr.querySelector('.btn-delete-shop').addEventListener('click', () => {
          deleteShopItem(item.item_name);
        });
      }

      shopItemsList.appendChild(tr);
    });
  }

  function updateShopItemPrice(item_name, price) {
    if (isNaN(price) || price < 0) {
      showToast('Veuillez entrer un prix valide.', true);
      return;
    }

    fetch('/api/config/shop/update-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name, price })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          loadGuildConfiguration();
          showToast('Prix de l\'article mis à jour avec succès !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
  }

  function deleteShopItem(item_name) {
    if (!confirm(`Voulez-vous vraiment supprimer "${item_name}" de la boutique ?`)) return;

    fetch('/api/config/shop/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          loadGuildConfiguration();
          showToast('Objet supprimé de la boutique !');
        }
      })
      .catch(console.error);
  }

  // --- LEVEL REWARDS MANAGER ---

  formAddLevelReward.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      level: parseInt(document.getElementById('reward_level').value),
      role_id: document.getElementById('reward_role').value
    };

    fetch('/api/config/level-rewards/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          formAddLevelReward.reset();
          loadGuildConfiguration();
          showToast('Récompense de niveau ajoutée !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
  });

  function renderLevelRewards(rewards) {
    if (rewards.length === 0) {
      levelRewardsList.innerHTML = '<tr><td colspan="3" class="text-center">Aucun rôle de récompense configuré.</td></tr>';
      return;
    }

    levelRewardsList.innerHTML = '';
    rewards.forEach(rew => {
      const tr = document.createElement('tr');
      const roleName = rolesList.find(r => r.id === rew.role_id)?.name || `<@&${rew.role_id}>`;

      tr.innerHTML = `
        <td><strong>Niveau ${rew.level}</strong></td>
        <td><span class="role-badge">${roleName}</span></td>
        <td><button class="btn btn-danger btn-delete-reward" data-level="${rew.level}"><i class="fa-solid fa-trash-can"></i> Supprimer</button></td>
      `;

      tr.querySelector('.btn-delete-reward').addEventListener('click', () => {
        deleteLevelReward(rew.level);
      });

      levelRewardsList.appendChild(tr);
    });
  }

  function deleteLevelReward(level) {
    if (!confirm(`Voulez-vous vraiment supprimer la récompense du niveau ${level} ?`)) return;

    fetch('/api/config/level-rewards/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          loadGuildConfiguration();
          showToast('Récompense supprimée !');
        }
      })
      .catch(console.error);
  }

  // --- TOAST ---
  function showToast(message, isError = false) {
    let tEl = document.getElementById('toast');
    if (!tEl) {
      tEl = document.createElement('div');
      tEl.id = 'toast';
      tEl.className = 'toast glass';
      document.body.appendChild(tEl);
    }
    tEl.textContent = message;
    if (isError) {
      tEl.style.borderColor = '#e74c3c';
      tEl.style.color = '#e74c3c';
      tEl.style.boxShadow = '0 4px 20px rgba(231, 76, 60, 0.4)';
    } else {
      tEl.style.borderColor = '#2ecc71';
      tEl.style.color = '#2ecc71';
      tEl.style.boxShadow = '0 4px 20px rgba(46, 204, 113, 0.4)';
    }
    tEl.classList.add('show');
    setTimeout(() => {
      tEl.classList.remove('show');
    }, 3500);
  }
  window.showToast = showToast;

  // --- ACTION GIFS MANAGER ---

  function fetchAndRenderGifs() {
    const selectedAction = document.getElementById('select-action-view').value;
    const container = document.getElementById('gifs-grid-container');
    container.innerHTML = '<p class="text-center" style="grid-column: 1/-1;">Chargement des GIFs...</p>';
    
    fetch('/api/config/action-gifs')
      .then(res => res.json())
      .then(gifs => {
        const actionGifs = gifs.filter(g => g.action_name === selectedAction);
        container.innerHTML = '';
        if (actionGifs.length === 0) {
          container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: #8e9297;">Aucun GIF configuré pour cette action.</p>';
          return;
        }
        
        actionGifs.forEach(gif => {
          const card = document.createElement('div');
          card.className = 'gif-card';
          
          const img = document.createElement('img');
          img.src = gif.gif_url;
          img.alt = gif.action_name;
          card.appendChild(img);
          
          const overlay = document.createElement('div');
          overlay.className = 'gif-card-overlay';
          
          const delBtn = document.createElement('button');
          delBtn.className = 'btn-delete-gif';
          delBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Supprimer';
          delBtn.addEventListener('click', () => {
            if (confirm('Voulez-vous supprimer ce GIF ?')) {
              fetch('/api/config/action-gifs/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: gif.id })
              })
              .then(res => res.json())
              .then(resData => {
                if (resData.success) {
                  showToast('GIF supprimé !');
                  fetchAndRenderGifs();
                } else {
                  alert('Erreur lors de la suppression.');
                }
              });
            }
          });
          
          overlay.appendChild(delBtn);
          card.appendChild(overlay);
          container.appendChild(card);
        });
      })
      .catch(err => {
        console.error(err);
        container.innerHTML = '<p class="text-center" style="grid-column: 1/-1; color: var(--danger-color);">Erreur de chargement des GIFs.</p>';
      });
  }

  document.getElementById('select-action-view').addEventListener('change', fetchAndRenderGifs);

  const formAddGif = document.getElementById('form-add-gif');
  formAddGif.addEventListener('submit', (e) => {
    e.preventDefault();
    const action_name = document.getElementById('gif_action_name').value;
    const gif_url = document.getElementById('gif_url').value;
    
    fetch('/api/config/action-gifs/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_name, gif_url })
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('GIF ajouté avec succès !');
        document.getElementById('gif_url').value = '';
        document.getElementById('select-action-view').value = action_name;
        fetchAndRenderGifs();
      } else {
        alert('Erreur lors de l\'ajout du GIF : ' + (resData.error || 'Erreur inconnue'));
      }
    })
    .catch(err => {
      console.error(err);
      alert('Erreur lors de l\'ajout du GIF : ' + err.message);
    });
  });

  // --- INTERACTION CLIC AVATAR ET TELEVERSEMENT DE FICHIERS ---

  // Cliquer sur l'avatar du bot pour modifier l'image
  document.getElementById('discord-avatar-click-container').addEventListener('click', () => {
    const wrapper = document.getElementById('bot-avatar-wrapper');
    if (wrapper.style.display === 'none') {
      wrapper.style.display = 'inline-flex';
      document.getElementById('bot-avatar-url-input').focus();
    } else {
      wrapper.style.display = 'none';
    }
  });

  // Gestionnaire de téléversement pour les inputs génériques (.file-upload-input)
  document.querySelectorAll('.file-upload-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const targetId = e.target.getAttribute('data-target');
      const targetInput = document.getElementById(targetId);
      
      const formData = new FormData();
      formData.append('file', file);
      
      showToast('Téléversement en cours...');
      fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Fichier téléversé avec succès !');
          targetInput.value = resData.url;
          // Déclencher l'événement 'input' pour rafraîchir l'embed Discord interactif
          targetInput.dispatchEvent(new Event('input'));
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur de téléversement: ' + err.message, true));
    });
  });

  // Téléversement d'avatar du bot
  document.getElementById('bot-avatar-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showToast('Téléversement de l\'avatar...');
    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        const avatar_url = resData.url;
        showToast('Mise à jour de l\'avatar du bot...');
        fetch('/api/bot/avatar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url })
        })
        .then(res => res.json())
        .then(avatarData => {
          if (avatarData.success) {
            showToast('Image d\'avatar de l\'embed mise à jour avec succès !');
            document.getElementById('bot-avatar-url-input').value = '';
            document.getElementById('bot-avatar-wrapper').style.display = 'none';
            fetchBotInfo(avatarData.avatarURL);
          } else {
            showToast('Erreur avatar: ' + avatarData.error, true);
          }
        });
      } else {
        showToast('Erreur de téléversement: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // Téléversement de GIF pour les actions
  document.getElementById('gif-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showToast('Téléversement du GIF...');
    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
    .then(res => res.json())
    .then(resData => {
      if (resData.success) {
        showToast('GIF téléversé avec succès !');
        document.getElementById('gif_url').value = resData.url;
      } else {
        showToast('Erreur: ' + resData.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });

  // --- LOGIQUE INTERACTIVE D'AUTO-RÔLES ---

  let autoroleButtonsList = []; // Stocke { role_id, label, emoji, style }

  document.getElementById('form-add-autorole-join').addEventListener('submit', (e) => {
    e.preventDefault();
    const role_id = document.getElementById('autorole-join-select').value;
    if (!role_id) return;
    fetch('/api/config/autoroles-on-join/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Rôle de join ajouté !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + data.error, true);
      }
    })
    .catch(err => showToast(err.message, true));
  });

  document.getElementById('form-add-autorole-role').addEventListener('submit', (e) => {
    e.preventDefault();
    const trigger_role_id = document.getElementById('autorole-trigger-select').value;
    const target_role_id = document.getElementById('autorole-target-select').value;
    if (!trigger_role_id || !target_role_id) return;
    fetch('/api/config/autoroles-on-role/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger_role_id, target_role_id })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Liaison de rôle créée !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + data.error, true);
      }
    })
    .catch(err => showToast(err.message, true));
  });

  const btnSyncAutoroleRole = document.getElementById('btn-sync-autorole-role');
  if (btnSyncAutoroleRole) {
    btnSyncAutoroleRole.addEventListener('click', () => {
      if (!confirm('Voulez-vous vraiment lancer la synchronisation rétroactive des auto-rôles pour tous les membres du serveur ? Cette opération peut prendre quelques secondes.')) return;
      
      btnSyncAutoroleRole.disabled = true;
      btnSyncAutoroleRole.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Synchronisation en cours...';

      fetch('/api/config/autoroles-on-role/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(res => res.json())
      .then(data => {
        btnSyncAutoroleRole.disabled = false;
        btnSyncAutoroleRole.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Synchroniser rétroactivement tous les membres';
        
        if (data.success) {
          showToast(`Liaisons synchronisées ! Rôles attribués: ${data.syncCount}, Échecs: ${data.errorCount}`);
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + data.error, true);
        }
      })
      .catch(err => {
        btnSyncAutoroleRole.disabled = false;
        btnSyncAutoroleRole.innerHTML = '<i class="fa-solid fa-arrows-rotate"></i> Synchroniser rétroactivement tous les membres';
        showToast(err.message, true);
      });
    });
  }

  document.getElementById('btn-add-autorole-button').addEventListener('click', () => {
    const role_id = document.getElementById('new-button-role').value;
    const label = document.getElementById('new-button-label').value.trim();
    const emoji = document.getElementById('new-button-emoji').value.trim();
    const style = document.getElementById('new-button-style').value;

    if (!role_id) {
      alert('Veuillez sélectionner un rôle.');
      return;
    }
    if (!label) {
      alert('Veuillez saisir un libellé pour le bouton.');
      return;
    }
    if (autoroleButtonsList.length >= 5) {
      alert('Vous pouvez ajouter un maximum de 5 boutons.');
      return;
    }

    autoroleButtonsList.push({ role_id, label, emoji, style });
    
    // Reset inputs
    document.getElementById('new-button-role').value = '';
    document.getElementById('new-button-label').value = '';
    document.getElementById('new-button-emoji').value = '';
    document.getElementById('new-button-style').value = 'PRIMARY';

    renderButtonsCreatorPreview();
  });

  function renderButtonsCreatorPreview() {
    const container = document.getElementById('autorole-embed-buttons-preview');
    const noButtonsText = document.getElementById('no-buttons-text');
    
    container.innerHTML = '';
    
    if (autoroleButtonsList.length === 0) {
      noButtonsText.style.display = 'block';
      container.appendChild(noButtonsText);
      
      const previewButtonsContainer = document.getElementById('autorole-preview-buttons');
      if (previewButtonsContainer) previewButtonsContainer.innerHTML = '';
      return;
    }
    noButtonsText.style.display = 'none';

    autoroleButtonsList.forEach((btn, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'badge';
      wrapper.style.padding = '8px 12px';
      wrapper.style.background = 'rgba(255,255,255,0.05)';
      wrapper.style.border = '1px solid rgba(255,255,255,0.1)';
      wrapper.style.borderRadius = '4px';
      wrapper.style.display = 'inline-flex';
      wrapper.style.alignItems = 'center';
      wrapper.style.gap = '8px';

      const styleLabel = btn.style === 'SUCCESS' ? 'Vert' : (btn.style === 'DANGER' ? 'Rouge' : (btn.style === 'SECONDARY' ? 'Gris' : 'Bleu'));
      wrapper.innerHTML = `
        <span style="font-weight: 500;">${btn.emoji || ''} ${btn.label} (${getRoleName(btn.role_id)}) [${styleLabel}]</span>
        <button type="button" style="background: none; border: none; color: #ff5555; cursor: pointer; font-size: 0.9rem;" title="Retirer ce bouton"><i class="fa-solid fa-xmark"></i></button>
      `;

      wrapper.querySelector('button').addEventListener('click', () => {
        autoroleButtonsList.splice(index, 1);
        renderButtonsCreatorPreview();
      });

      container.appendChild(wrapper);
    });

    // Mettre à jour l'aperçu en direct des boutons / sélecteur / réactions
    const previewButtonsContainer = document.getElementById('autorole-preview-buttons');
    if (previewButtonsContainer) {
      previewButtonsContainer.innerHTML = '';
      const type = document.getElementById('autorole-embed-type').value;

      if (type === 'buttons') {
        autoroleButtonsList.forEach(btn => {
          const pBtn = document.createElement('button');
          pBtn.type = 'button';
          pBtn.style.padding = '6px 16px';
          pBtn.style.fontSize = '0.85rem';
          pBtn.style.borderRadius = '3px';
          pBtn.style.border = 'none';
          pBtn.style.cursor = 'default';
          pBtn.style.display = 'inline-flex';
          pBtn.style.alignItems = 'center';
          pBtn.style.gap = '6px';
          pBtn.style.fontWeight = '500';
          
          let bgColor = '#5865F2';
          let textColor = '#ffffff';
          if (btn.style === 'SECONDARY') { bgColor = '#4f545c'; }
          else if (btn.style === 'SUCCESS') { bgColor = '#43b581'; }
          else if (btn.style === 'DANGER') { bgColor = '#f04747'; }
          
          pBtn.style.background = bgColor;
          pBtn.style.color = textColor;
          pBtn.innerHTML = `<span>${btn.emoji || ''}</span> <span>${btn.label}</span>`;
          previewButtonsContainer.appendChild(pBtn);
        });
      } else if (type === 'select' || type === 'multi_select') {
        if (autoroleButtonsList.length > 0) {
          const selectSim = document.createElement('div');
          selectSim.style.width = '100%';
          selectSim.style.background = '#2f3136';
          selectSim.style.border = '1px solid rgba(255,255,255,0.05)';
          selectSim.style.padding = '8px 12px';
          selectSim.style.borderRadius = '4px';
          selectSim.style.color = '#dcddde';
          selectSim.style.display = 'flex';
          selectSim.style.justifyContent = 'space-between';
          selectSim.style.alignItems = 'center';
          selectSim.style.fontSize = '0.9rem';
          selectSim.style.cursor = 'default';
          selectSim.innerHTML = `
            <span>${type === 'multi_select' ? 'Sélectionnez un ou plusieurs rôles...' : 'Sélectionnez un rôle...'} (${autoroleButtonsList.length} options)</span>
            <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; color: #b9bbbe;"></i>
          `;
          previewButtonsContainer.appendChild(selectSim);
        }
      } else if (type === 'reactions') {
        autoroleButtonsList.forEach(btn => {
          const pReact = document.createElement('div');
          pReact.style.display = 'inline-flex';
          pReact.style.alignItems = 'center';
          pReact.style.gap = '6px';
          pReact.style.background = 'rgba(255,255,255,0.05)';
          pReact.style.border = '1px solid rgba(255,255,255,0.1)';
          pReact.style.padding = '4px 8px';
          pReact.style.borderRadius = '4px';
          pReact.style.fontSize = '0.85rem';
          pReact.style.cursor = 'default';
          pReact.style.marginRight = '6px';
          pReact.innerHTML = `<span>${btn.emoji || '❓'}</span> <span style="color: #b9bbbe; font-weight:600;">1</span>`;
          previewButtonsContainer.appendChild(pReact);
        });
      }
    }
  }

  document.getElementById('form-create-autorole-embed').addEventListener('submit', (e) => {
    e.preventDefault();
    const channel_id = document.getElementById('autorole-embed-channel').value;
    const title = document.getElementById('autorole-embed-title').value.trim();
    const description = document.getElementById('autorole-embed-desc').value.trim();
    const color = document.getElementById('autorole-embed-color').value;
    const thumbnail = parseInt(document.getElementById('autorole-embed-thumbnail').value);
    const image_url = document.getElementById('autorole-embed-image').value.trim();
    const type = document.getElementById('autorole-embed-type').value;
    const mode = document.getElementById('autorole-embed-mode').value;
    const existing_message_id = document.getElementById('autorole-embed-existing-msg').value.trim() || null;

    if (!existing_message_id) {
      if (!title) {
        alert("Veuillez saisir un titre pour l'embed.");
        return;
      }
      if (!description) {
        alert("Veuillez saisir une description / message.");
        return;
      }
    }

    if (autoroleButtonsList.length === 0) {
      alert('Veuillez ajouter au moins un rôle/bouton.');
      return;
    }

    showToast('Envoi de la configuration...');
    fetch('/api/config/autorole-embeds/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel_id,
        title,
        description,
        color,
        thumbnail,
        image_url,
        type,
        mode,
        existing_message_id,
        options: autoroleButtonsList
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast(existing_message_id ? 'Configuration ajoutée au message avec succès !' : 'Embed d\'auto-rôle envoyé et enregistré !');
        document.getElementById('autorole-embed-title').value = '';
        document.getElementById('autorole-embed-desc').value = '';
        document.getElementById('autorole-embed-image').value = '';
        document.getElementById('autorole-embed-existing-msg').value = '';
        autoroleButtonsList = [];
        renderButtonsCreatorPreview();
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + data.error, true);
      }
    })
    .catch(err => showToast(err.message, true));
  });

  // --- LIVE PREVIEW POUR AUTO-RÔLES ---
  const updateAutorolePreview = () => {
    const title = document.getElementById('autorole-embed-title').value.trim() || 'Aperçu du titre';
    const desc = document.getElementById('autorole-embed-desc').value.trim() || 'Aperçu de la description...';
    const color = document.getElementById('autorole-embed-color').value;
    const thumbnailOpt = document.getElementById('autorole-embed-thumbnail').value;
    const imageUrl = document.getElementById('autorole-embed-image').value.trim();
    const existingMsgId = document.getElementById('autorole-embed-existing-msg').value.trim();
    const embedCard = document.getElementById('autorole-discord-embed');

    // Aperçu visuel de l'embed
    embedCard.style.display = 'block';

    let banner = document.getElementById('autorole-preview-existing-banner');
    if (existingMsgId) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'autorole-preview-existing-banner';
        banner.style.background = 'rgba(241, 196, 15, 0.15)';
        banner.style.border = '1px solid #f1c40f';
        banner.style.padding = '10px';
        banner.style.borderRadius = '4px';
        banner.style.color = '#f1c40f';
        banner.style.fontSize = '0.85rem';
        banner.style.marginBottom = '10px';
        embedCard.parentNode.insertBefore(banner, embedCard);
      }
      banner.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Mode Édition : Modification du message Discord <strong>${existingMsgId}</strong>.`;
      banner.style.display = 'block';
    } else if (banner) {
      banner.style.display = 'none';
    }

    document.getElementById('autorole-preview-title').textContent = title;
    document.getElementById('autorole-preview-desc').textContent = desc;
    document.getElementById('autorole-discord-embed').style.borderLeftColor = color;

    const thumbnailImg = document.getElementById('autorole-preview-thumbnail');
    const guildId = guildSelect.value;
    const selectedGuildInfo = guildsList.find(g => g.id === guildId);
    
    if (thumbnailOpt === '1' && selectedGuildInfo && selectedGuildInfo.icon) {
      thumbnailImg.src = `https://cdn.discordapp.com/icons/${selectedGuildInfo.id}/${selectedGuildInfo.icon}.png`;
      thumbnailImg.style.display = 'block';
    } else {
      thumbnailImg.style.display = 'none';
    }

    const previewImg = document.getElementById('autorole-preview-image');
    if (imageUrl) {
      previewImg.src = imageUrl;
      previewImg.style.display = 'block';
    } else {
      previewImg.style.display = 'none';
    }
  };

  document.getElementById('autorole-embed-title').addEventListener('input', updateAutorolePreview);
  document.getElementById('autorole-embed-desc').addEventListener('input', updateAutorolePreview);
  document.getElementById('autorole-embed-color').addEventListener('input', updateAutorolePreview);
  document.getElementById('autorole-embed-thumbnail').addEventListener('change', updateAutorolePreview);
  document.getElementById('autorole-embed-image').addEventListener('input', updateAutorolePreview);
  document.getElementById('autorole-embed-type').addEventListener('change', () => {
    renderButtonsCreatorPreview();
    updateAutorolePreview();
  });
  document.getElementById('autorole-embed-existing-msg').addEventListener('input', updateAutorolePreview);

  // --- LOGIQUE INTERACTIVE DE L'AUTO-THREAD ---

  document.getElementById('form-add-autothread-channel').addEventListener('submit', (e) => {
    e.preventDefault();
    const channel_id = document.getElementById('autothread-channel-select').value;
    const image_only = document.getElementById('autothread-image-only').checked ? 1 : 0;

    if (autothreadChannelsList.some(ch => ch.channel_id === channel_id)) {
      showToast('Ce salon est déjà configuré.', true);
      return;
    }

    const updatedList = [...autothreadChannelsList, { channel_id, image_only }];
    saveAutoThreadChannels(updatedList);
    
    // Reset form fields
    document.getElementById('autothread-channel-select').value = '';
    document.getElementById('autothread-image-only').checked = false;
    const select = document.getElementById('autothread-channel-select');
    if (select.syncCustomSelect) select.syncCustomSelect();
  });

  // --- LOGIQUE INTERACTIVE DU COUNTING ---

  document.getElementById('form-add-counting-channel').addEventListener('submit', (e) => {
    e.preventDefault();
    const channel_id = document.getElementById('counting-channel-select').value;
    const mode = document.getElementById('counting-mode-select').value;
    const start_number = parseFloat(document.getElementById('counting-start-number').value);

    fetch('/api/config/counting/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel_id, mode, start_number })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Salon de comptage configuré !');
        loadGuildConfiguration();
      } else {
        showToast('Erreur: ' + data.error, true);
      }
    })
    .catch(err => showToast(err.message, true));
  });

  // --- RENDERS POUR AUTO-ROLES ---

  function renderAutoroleJoin(list) {
    const container = document.getElementById('autorole-join-list');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<li style="color: #8e9297; padding: 10px; font-style: italic;">Aucun rôle automatique configuré.</li>';
      return;
    }
    list.forEach(item => {
      const roleName = getRoleName(item.role_id);
      const li = document.createElement('li');
      li.className = 'shop-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 12px';
      li.style.background = 'rgba(255, 255, 255, 0.05)';
      li.style.marginBottom = '5px';
      li.style.borderRadius = '4px';

      li.innerHTML = `
        <span style="font-weight: 500;"><i class="fa-solid fa-user-tag" style="color: #5865F2;"></i> ${roleName}</span>
        <button class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i></button>
      `;

      li.querySelector('.btn-delete').addEventListener('click', () => {
        fetch('/api/config/autoroles-on-join/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role_id: item.role_id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Rôle de join supprimé !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + data.error, true);
          }
        })
        .catch(err => showToast(err.message, true));
      });

      container.appendChild(li);
    });
  }

  function renderAutoroleRole(list) {
    const container = document.getElementById('autorole-role-list');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<li style="color: #8e9297; padding: 10px; font-style: italic;">Aucune liaison de rôle configurée.</li>';
      return;
    }
    list.forEach(item => {
      const triggerName = getRoleName(item.trigger_role_id);
      const targetName = getRoleName(item.target_role_id);
      const li = document.createElement('li');
      li.className = 'shop-item';
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 12px';
      li.style.background = 'rgba(255, 255, 255, 0.05)';
      li.style.marginBottom = '5px';
      li.style.borderRadius = '4px';

      li.innerHTML = `
        <span style="font-size: 0.9rem;">
          <i class="fa-solid fa-tag" style="color: #E67E22;"></i> <strong>${triggerName}</strong> 
          <i class="fa-solid fa-arrow-right" style="margin: 0 5px; font-size: 0.8rem; color: #8e9297;"></i> 
          <strong>${targetName}</strong>
        </span>
        <button class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i></button>
      `;

      li.querySelector('.btn-delete').addEventListener('click', () => {
        fetch('/api/config/autoroles-on-role/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger_role_id: item.trigger_role_id, target_role_id: item.target_role_id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Liaison de rôle supprimée !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + data.error, true);
          }
        })
        .catch(err => showToast(err.message, true));
      });

      container.appendChild(li);
    });
  }

  function renderActiveAutoroles(list) {
    const container = document.getElementById('active-autoroles-container');
    if (!container) return;
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<p style="color: #8e9297; text-align: center; font-style: italic;">Aucun rôle réaction actif.</p>';
      return;
    }
    list.forEach(item => {
      try {
        const channelName = getChannelName(item.channel_id);
        const card = document.createElement('div');
        card.className = 'card';
        card.style.background = 'rgba(255,255,255,0.03)';
        card.style.border = '1px solid rgba(255,255,255,0.05)';
        card.style.padding = '12px 15px';
        card.style.borderRadius = '6px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.gap = '8px';

        const buttonsHtml = (item.options || []).map(opt => {
          const styleClass = opt.style === 'SUCCESS' ? 'btn-save' : (opt.style === 'DANGER' ? 'btn-delete' : 'btn-add');
          return `<span class="badge ${styleClass}" style="margin-right: 5px; padding: 4px 8px; font-size: 0.8rem; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
            ${opt.emoji || ''} ${opt.label} (${getRoleName(opt.role_id)})
          </span>`;
        }).join(' ');

        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="margin: 0; color: #fff;">${item.title || '(Message Existant)'}</h4>
            <div style="display: flex; gap: 6px;">
              <button type="button" class="btn btn-edit-embed btn-sm" style="padding: 4px 8px; font-size: 0.8rem; background: #3498db; color: #fff;"><i class="fa-solid fa-pen-to-square"></i> Modifier</button>
              <button type="button" class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i> Supprimer</button>
            </div>
          </div>
          <p style="margin: 2px 0; font-size: 0.85rem; color: #b9bbbe;">
            <i class="fa-solid fa-hashtag"></i> Salon: <strong>${channelName}</strong> · ID Message: <code>${item.message_id}</code>
          </p>
          <p style="margin: 2px 0; font-size: 0.85rem; color: #8e9297; font-style: italic;">"${item.description || ''}"</p>
          <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
            ${buttonsHtml}
          </div>
        `;

        const editBtn = card.querySelector('.btn-edit-embed');
        if (editBtn) {
          editBtn.addEventListener('click', () => {
            const autoroleTabBtn = document.querySelector('.tab-btn[data-tab="tab-reactionroles"]');
            if (autoroleTabBtn) autoroleTabBtn.click();
            
            const chanEl = document.getElementById('autorole-embed-channel');
            if (chanEl) chanEl.value = item.channel_id;
            const msgEl = document.getElementById('autorole-embed-existing-msg');
            if (msgEl) msgEl.value = item.message_id;
            const titleEl = document.getElementById('autorole-embed-title');
            if (titleEl) titleEl.value = item.title === '(Message Existant)' ? '' : (item.title || '');
            const descEl = document.getElementById('autorole-embed-desc');
            if (descEl) descEl.value = item.description === '(Pas d\'embed)' ? '' : (item.description || '');
            const colorEl = document.getElementById('autorole-embed-color');
            if (colorEl) colorEl.value = item.color || '#5865F2';
            const thumbEl = document.getElementById('autorole-embed-thumbnail');
            if (thumbEl) thumbEl.value = item.thumbnail ? '1' : '0';
            const imgEl = document.getElementById('autorole-embed-image');
            if (imgEl) imgEl.value = item.image_url || '';
            const typeEl = document.getElementById('autorole-embed-type');
            if (typeEl) typeEl.value = item.type || 'buttons';
            const modeEl = document.getElementById('autorole-embed-mode');
            if (modeEl) modeEl.value = item.mode || 'normal';

            autoroleButtonsList = (item.options || []).map(opt => ({
              role_id: opt.role_id,
              label: opt.label || '',
              emoji: opt.emoji || '',
              style: opt.style || 'PRIMARY'
            }));

            if (typeof renderButtonsCreatorList === 'function') renderButtonsCreatorList();
            if (typeof renderButtonsCreatorPreview === 'function') renderButtonsCreatorPreview();
            if (typeof updateAutorolePreview === 'function') updateAutorolePreview();
            showToast('Panneau d\'auto-rôle chargé pour modification !');
          });
        }

        card.querySelector('.btn-delete').addEventListener('click', () => {
          if (!confirm('Voulez-vous vraiment supprimer ce rôle réaction ? Le message sera supprimé de Discord et de la base de données.')) return;
          fetch('/api/config/autorole-embeds/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message_id: item.message_id, channel_id: item.channel_id })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              showToast('Rôle réaction supprimé !');
              loadGuildConfiguration();
            } else {
              showToast('Erreur: ' + data.error, true);
            }
          })
          .catch(err => showToast(err.message, true));
        });

        container.appendChild(card);
      } catch (err) {
        console.error('Error rendering active autorole item:', err, item);
      }
    });
  }

  function renderSimpleEmbedsSavedList(list) {
    const container = document.getElementById('simple-embeds-saved-list');
    if (!container) return;
    container.innerHTML = '';

    if (!list || list.length === 0) {
      container.innerHTML = '<p style="color: #8e9297; font-style: italic; font-size: 0.85rem;">Aucun embed enregistré pour le moment. Créez-en un via le formulaire ci-dessous !</p>';
      return;
    }

    list.forEach(item => {
      const channelName = getChannelName(item.channel_id);
      const itemCard = document.createElement('div');
      itemCard.style.background = 'rgba(255,255,255,0.03)';
      itemCard.style.border = '1px solid rgba(255,255,255,0.08)';
      itemCard.style.padding = '10px 14px';
      itemCard.style.borderRadius = '8px';
      itemCard.style.display = 'flex';
      itemCard.style.alignItems = 'center';
      itemCard.style.justifyContent = 'space-between';
      itemCard.style.gap = '10px';

      itemCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0;">
          <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">${item.title || '(Sans titre)'}</div>
          <div style="font-size: 0.8rem; color: #b9bbbe;">
            <i class="fa-solid fa-hashtag" style="color: #5865F2;"></i> <strong>${channelName}</strong> · ID: <code>${item.message_id}</code>
          </div>
          <div style="font-size: 0.8rem; color: #8e9297; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            "${(item.description || '').slice(0, 70)}"
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-load-embed" style="background: #9b59b6; color: #fff; padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; flex-shrink: 0; cursor: pointer;">
          <i class="fa-solid fa-download"></i> Charger dans l'Éditeur
        </button>
      `;

      itemCard.querySelector('.btn-load-embed').addEventListener('click', () => {
        safeSetVal('simple_embed_channel', item.channel_id);
        safeSetVal('simple_embed_edit_msg_id', item.message_id);
        safeSetVal('simple_embed_title', item.title || '');
        safeSetVal('simple_embed_desc', item.description || '');
        safeSetVal('simple_embed_color', item.color || '#5865F2');
        safeSetVal('simple_embed_image', item.image_url || '');
        if (typeof updatePreview === 'function') updatePreview();

        const formEl = document.getElementById('form-simple-embed');
        if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
        showToast('Embed chargé dans l\'éditeur !');
      });

      container.appendChild(itemCard);
    });
  }

  // --- RENDERS POUR AUTO-THREAD ---

  let autothreadChannelsList = [];

  function renderAutoThreadChannels(list) {
    autothreadChannelsList = list;
    const container = document.getElementById('autothread-channels-list-tbody');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<tr><td colspan="3" style="color: #8e9297; text-align: center; font-style: italic; padding: 15px;">Aucun salon Auto-Thread configuré.</td></tr>';
      return;
    }
    list.forEach(item => {
      const channelName = getChannelName(item.channel_id);
      const tr = document.createElement('tr');
      
      const typeLabel = item.image_only === 1 ? '🖼️ Images Uniquement (Thread-only chat)' : '💬 Normal (Création de fil)';

      tr.innerHTML = `
        <td style="font-weight: 600;"><i class="fa-solid fa-hashtag" style="color: #7289da;"></i> ${channelName}</td>
        <td><span class="badge" style="background: rgba(114, 137, 218, 0.2); color: #7289da; padding: 4px 8px; border-radius: 4px;">${typeLabel}</span></td>
        <td>
          <button class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i> Retirer</button>
        </td>
      `;

      tr.querySelector('.btn-delete').addEventListener('click', () => {
        if (!confirm('Voulez-vous désactiver l\'Auto-Thread pour ce salon ?')) return;
        const updatedList = autothreadChannelsList.filter(ch => ch.channel_id !== item.channel_id);
        saveAutoThreadChannels(updatedList);
      });

      container.appendChild(tr);
    });
  }

  function saveAutoThreadChannels(channels) {
    fetch('/api/config/autothread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channels })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        showToast('Configuration Auto-Thread mise à jour !');
        renderAutoThreadChannels(channels);
      } else {
        showToast('Erreur: ' + data.error, true);
      }
    })
    .catch(err => showToast(err.message, true));
  }

  // --- RENDERS POUR COUNTING ---

  function renderCountingChannels(list) {
    const container = document.getElementById('counting-channels-list-tbody');
    if (!container) return;
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<tr><td colspan="8" style="color: #8e9297; text-align: center; font-style: italic; padding: 15px;">Aucun salon de comptage configuré.</td></tr>';
      return;
    }
    list.forEach(item => {
      const channelName = getChannelName(item.channel_id);
      const tr = document.createElement('tr');
      
      const modeLabel = item.mode === 'math' ? 'Mathématique' : (item.mode === 'reverse' ? 'Inversé' : 'Normal');

      const emojiSuccess = item.emoji_success || '✅';
      const emojiError = item.emoji_error || '❌';
      const emojiHighscore = item.emoji_highscore || '🏆';
      const emojiChance = item.emoji_chance || '🍀';

      tr.innerHTML = `
        <td style="font-weight: 600;"><i class="fa-solid fa-hashtag" style="color: #7289da;"></i> ${channelName}</td>
        <td><span class="badge" style="background: rgba(114, 137, 218, 0.2); color: #7289da; padding: 4px 8px; border-radius: 4px;">${modeLabel}</span></td>
        <td style="font-weight: bold; color: #fff;">${item.current_number}</td>
        <td>${item.start_number}</td>
        <td style="font-weight: bold; color: #2ecc71;">${item.high_score}</td>
        <td><span title="Succès: ${emojiSuccess} | Erreur: ${emojiError} | Record: ${emojiHighscore} | Chance: ${emojiChance}">${emojiSuccess} ${emojiError} ${emojiHighscore} ${emojiChance}</span></td>
        <td>${item.last_user_id ? `<@${item.last_user_id}>` : '<span style="color:#8e9297; font-style:italic;">Aucun</span>'}</td>
        <td>
          <button class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i> Retirer</button>
        </td>
      `;

      tr.querySelector('.btn-delete').addEventListener('click', () => {
        if (!confirm('Voulez-vous supprimer ce salon de comptage ? Les statistiques et le record seront effacés.')) return;
        fetch('/api/config/counting/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel_id: item.channel_id })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('Salon de comptage retiré !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + data.error, true);
          }
        })
        .catch(err => showToast(err.message, true));
      });

      container.appendChild(tr);
    });
  }

  function getRoleName(roleId) {
    const role = rolesList.find(r => r.id === roleId);
    return role ? role.name : roleId;
  }

  function getChannelName(channelId) {
    const chan = channelsList.find(c => c.id === channelId);
    return chan ? chan.name : channelId;
  }

  function makeSelectSearchable(selectElement) {
    if (!selectElement) return;
    if (selectElement.multiple) return;
    if (selectElement.dataset.searchableTransformed) return;
    selectElement.dataset.searchableTransformed = 'true';

    // Cacher le sélecteur natif
    selectElement.style.display = 'none';

    // Créer le wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);

    // Créer le déclencheur (bouton)
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    triggerText.textContent = selectElement.options[selectElement.selectedIndex]?.text || 'Sélectionner...';
    trigger.appendChild(triggerText);

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-chevron-down';
    trigger.appendChild(icon);
    wrapper.appendChild(trigger);

    // Créer le panneau des options
    const panel = document.createElement('div');
    panel.className = 'custom-select-options-panel';

    // Créer la barre de recherche
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'custom-select-search-wrapper';
    
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-magnifying-glass';
    searchWrapper.appendChild(searchIcon);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Rechercher...';
    searchInput.className = 'custom-select-search-input';
    searchWrapper.appendChild(searchInput);
    panel.appendChild(searchWrapper);

    // Créer la liste des options
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options-list';
    panel.appendChild(optionsList);
    wrapper.appendChild(panel);

    function renderOptions() {
      optionsList.innerHTML = '';
      const query = searchInput.value.toLowerCase().trim();
      
      Array.from(selectElement.options).forEach((opt, idx) => {
        const text = opt.text;
        if (query && opt.value !== '' && !text.toLowerCase().includes(query)) return;

        const item = document.createElement('div');
        item.className = 'custom-select-option-item';
        if (opt.selected) {
          item.classList.add('selected');
        }
        item.textContent = text;
        item.dataset.value = opt.value;

        item.addEventListener('click', () => {
          selectElement.selectedIndex = idx;
          triggerText.textContent = text;
          
          optionsList.querySelectorAll('.custom-select-option-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          
          selectElement.dispatchEvent(new Event('change'));
          wrapper.classList.remove('open');
        });

        optionsList.appendChild(item);
      });

      if (optionsList.children.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'custom-select-option-item';
        noResult.style.color = '#72767d';
        noResult.style.cursor = 'default';
        noResult.textContent = 'Aucun résultat';
        optionsList.appendChild(noResult);
      }
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });

      wrapper.classList.toggle('open');
      if (wrapper.classList.contains('open')) {
        renderOptions();
        searchInput.value = '';
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', renderOptions);

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });

    // Synchronisation en cas de changement manuel
    selectElement.addEventListener('change', () => {
      triggerText.textContent = selectElement.options[selectElement.selectedIndex]?.text || 'Sélectionner...';
    });

    selectElement.syncCustomSelect = () => {
      triggerText.textContent = selectElement.options[selectElement.selectedIndex]?.text || 'Sélectionner...';
      if (wrapper.classList.contains('open')) {
        renderOptions();
      }
    };
  }

  function makeSelectMultiple(selectElement) {
    if (!selectElement) return;
    if (!selectElement.multiple) return;
    if (selectElement.dataset.searchableTransformed) return;
    selectElement.dataset.searchableTransformed = 'true';

    // Cacher le sélecteur natif
    selectElement.style.display = 'none';

    // Créer le wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper multiple';
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);

    // Créer le déclencheur (bouton)
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const triggerText = document.createElement('span');
    trigger.appendChild(triggerText);

    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-chevron-down';
    trigger.appendChild(icon);
    wrapper.appendChild(trigger);

    // Créer le panneau des options
    const panel = document.createElement('div');
    panel.className = 'custom-select-options-panel';

    // Créer la barre de recherche
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'custom-select-search-wrapper';
    
    const searchIcon = document.createElement('i');
    searchIcon.className = 'fa-solid fa-magnifying-glass';
    searchWrapper.appendChild(searchIcon);

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Rechercher...';
    searchInput.className = 'custom-select-search-input';
    searchWrapper.appendChild(searchInput);
    panel.appendChild(searchWrapper);

    // Créer la liste des options
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options-list';
    panel.appendChild(optionsList);
    wrapper.appendChild(panel);

    function updateTriggerText() {
      const selectedOptions = Array.from(selectElement.selectedOptions);
      if (selectedOptions.length === 0) {
        triggerText.textContent = 'Aucun sélectionné...';
        triggerText.style.color = '#72767d';
      } else {
        triggerText.textContent = selectedOptions.map(opt => opt.text).join(', ');
        triggerText.style.color = '#fff';
      }
    }

    function renderOptions() {
      optionsList.innerHTML = '';
      const filter = searchInput.value.toLowerCase().trim();
      let count = 0;

      Array.from(selectElement.options).forEach((option, idx) => {
        if (!option.value) return; // ignorer les placeholders vides

        if (!filter || option.text.toLowerCase().includes(filter)) {
          count++;
          const item = document.createElement('div');
          item.className = 'custom-select-option-item';
          item.style.display = 'flex';
          item.style.alignItems = 'center';
          item.style.gap = '10px';
          
          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = option.selected;
          checkbox.style.cursor = 'pointer';
          
          const labelSpan = document.createElement('span');
          labelSpan.textContent = option.text;
          
          item.appendChild(checkbox);
          item.appendChild(labelSpan);

          if (option.selected) {
            item.classList.add('selected');
          }

          item.addEventListener('click', (e) => {
            e.stopPropagation();
            option.selected = !option.selected;
            checkbox.checked = option.selected;
            item.classList.toggle('selected', option.selected);
            updateTriggerText();
            selectElement.dispatchEvent(new Event('change'));
          });

          checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            option.selected = checkbox.checked;
            item.classList.toggle('selected', checkbox.checked);
            updateTriggerText();
            selectElement.dispatchEvent(new Event('change'));
          });

          optionsList.appendChild(item);
        }
      });

      if (count === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'custom-select-option-item';
        noResult.style.color = '#72767d';
        noResult.style.cursor = 'default';
        noResult.textContent = 'Aucun résultat';
        optionsList.appendChild(noResult);
      }
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });

      wrapper.classList.toggle('open');
      if (wrapper.classList.contains('open')) {
        renderOptions();
        searchInput.value = '';
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', renderOptions);

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });

    selectElement.addEventListener('change', () => {
      updateTriggerText();
    });

    selectElement.syncCustomSelect = () => {
      updateTriggerText();
      if (wrapper.classList.contains('open')) {
        renderOptions();
      }
    };

    updateTriggerText();
  }

  function initializeSearchableSelects() {
    const selectors = ['.role-select', '.channel-select', '.announce-channel-select', '.custom-select'];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(select => {
        if (select.multiple) {
          makeSelectMultiple(select);
        } else {
          makeSelectSearchable(select);
        }
      });
    });
  }

  function updateXpCurvePreview() {
    const base = parseInt(document.getElementById('xp_base').value) || 120;
    const factor = parseFloat(document.getElementById('xp_factor').value) || 1.35;
    const previewDiv = document.getElementById('xp-curve-preview');
    if (!previewDiv) return;

    previewDiv.innerHTML = '';
    const levelsToShow = [1, 2, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50];
    levelsToShow.forEach(lvl => {
      const xpRequired = Math.max(1, Math.round(base * Math.pow(factor, Math.max(0, lvl))));
      const card = document.createElement('div');
      card.style.background = 'rgba(255, 255, 255, 0.03)';
      card.style.border = '1px solid rgba(255, 255, 255, 0.04)';
      card.style.borderRadius = '6px';
      card.style.padding = '6px 8px';
      card.style.textAlign = 'center';
      card.innerHTML = `
        <div style="font-size: 0.72rem; opacity: 0.6; margin-bottom: 2px;">Niveau ${lvl}</div>
        <div style="font-size: 0.8rem; font-weight: 600; color: #00d2d3;">${xpRequired.toLocaleString('fr-FR')} XP</div>
      `;
      previewDiv.appendChild(card);
    });
  }

  // Attach input event listeners for real-time recalculation
  const xpBaseInput = document.getElementById('xp_base');
  const xpFactorInput = document.getElementById('xp_factor');
  if (xpBaseInput) xpBaseInput.addEventListener('input', updateXpCurvePreview);
  if (xpFactorInput) xpFactorInput.addEventListener('input', updateXpCurvePreview);

  // --- CONFIGURATION DES RECOMPENSES D'ACTIONS ---

  function updateActionRewardsForm() {
    const actionName = document.getElementById('reward_action_name').value;
    const reward = actionRewardsState.find(r => r.action_name === actionName);

    if (reward) {
      document.getElementById('reward_min_money').value = reward.min_money ?? 5;
      document.getElementById('reward_max_money').value = reward.max_money ?? 15;
      document.getElementById('reward_min_karma').value = reward.min_karma ?? 1;
      document.getElementById('reward_max_karma').value = reward.max_karma ?? 3;
    } else {
      document.getElementById('reward_min_money').value = 5;
      document.getElementById('reward_max_money').value = 15;
      document.getElementById('reward_min_karma').value = 1;
      document.getElementById('reward_max_karma').value = 3;
    }
  }

  const rewardActionSelect = document.getElementById('reward_action_name');
  if (rewardActionSelect) {
    rewardActionSelect.addEventListener('change', updateActionRewardsForm);
  }

  if (formActionRewards) {
    formActionRewards.addEventListener('submit', (e) => {
      e.preventDefault();
      const action_name = document.getElementById('reward_action_name').value;
      const data = {
        action_name,
        min_money: document.getElementById('reward_min_money').value,
        max_money: document.getElementById('reward_max_money').value,
        min_karma: document.getElementById('reward_min_karma').value,
        max_karma: document.getElementById('reward_max_karma').value
      };

      fetch('/api/config/action-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Gains de l\'action mis à jour !');
          // Mettre à jour l'état local
          const index = actionRewardsState.findIndex(r => r.action_name === action_name);
          const updatedReward = {
            guild_id: guildSelect.value,
            action_name,
            min_money: parseInt(data.min_money),
            max_money: parseInt(data.max_money),
            min_karma: parseInt(data.min_karma),
            max_karma: parseInt(data.max_karma)
          };
          if (index !== -1) {
            actionRewardsState[index] = updatedReward;
          } else {
            actionRewardsState.push(updatedReward);
          }
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast('Erreur: ' + err.message, true));
    });
  }

  // --- ASSISTANT IA D'ADMINISTRATION ---
  const formAiChat = document.getElementById('form-ai-chat');
  const aiChatInput = document.getElementById('ai-chat-input');
  const aiChatMessages = document.getElementById('ai-chat-messages');

  if (formAiChat && aiChatInput && aiChatMessages) {
    formAiChat.addEventListener('submit', (e) => {
      e.preventDefault();
      const message = aiChatInput.value.trim();
      if (!message) return;

      // Vider le champ
      aiChatInput.value = '';

      // Ajouter le message de l'utilisateur dans l'interface
      const userBubble = document.createElement('div');
      userBubble.className = 'ai-message-bubble ai-user';
      userBubble.style.display = 'flex';
      userBubble.style.gap = '12px';
      userBubble.style.alignSelf = 'flex-end';
      userBubble.style.maxWidth = '80%';
      userBubble.style.flexDirection = 'row-reverse';
      userBubble.innerHTML = `
        <div style="width: 36px; height: 36px; background: #34495e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">👤</div>
        <div style="background: rgba(52,152,219,0.15); padding: 12px 16px; border-radius: 16px 0 16px 16px; font-size: 0.92rem; line-height: 1.5; color: #e1e1e1;">
          ${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      `;
      aiChatMessages.appendChild(userBubble);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

      // Ajouter l'indicateur d'écriture
      const typingBubble = document.createElement('div');
      typingBubble.id = 'ai-typing';
      typingBubble.className = 'ai-message-bubble ai-bot';
      typingBubble.style.display = 'flex';
      typingBubble.style.gap = '12px';
      typingBubble.style.alignSelf = 'flex-start';
      typingBubble.style.maxWidth = '80%';
      typingBubble.innerHTML = `
        <div style="width: 36px; height: 36px; background: #9b59b6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">🤖</div>
        <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 0 16px 16px 16px; font-size: 0.92rem; line-height: 1.5; color: #e1e1e1; font-style: italic;">
          En train d'analyser vos consignes... ⚙️
        </div>
      `;
      aiChatMessages.appendChild(typingBubble);
      aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

      // Envoyer la requête au backend
      fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      })
      .then(res => {
        if (!res.ok) {
          // Gestion des erreurs HTTP (ex: 403 Forbidden réservé owner)
          return res.json().then(errData => {
            throw new Error(errData.error || 'Erreur lors de la communication avec l\'IA.');
          });
        }
        return res.json();
      })
      .then(data => {
        // Enlever la bulle d'écriture
        const tb = document.getElementById('ai-typing');
        if (tb) tb.remove();

        // Afficher la réponse de l'IA
        const botBubble = document.createElement('div');
        botBubble.className = 'ai-message-bubble ai-bot';
        botBubble.style.display = 'flex';
        botBubble.style.gap = '12px';
        botBubble.style.alignSelf = 'flex-start';
        botBubble.style.maxWidth = '80%';
        
        let responseText = data.reply;
        if (data.actions && data.actions.length > 0) {
          responseText += `<br><br><div style="font-size: 0.82rem; color: #2ecc71; background: rgba(46,204,113,0.08); padding: 8px 12px; border-radius: 6px; border: 1px dashed rgba(46,204,113,0.3);">⚙️ <strong>Actions exécutées :</strong><ul style="margin: 5px 0 0 15px; padding: 0;">`;
          data.actions.forEach(act => {
            let actName = act.type;
            if (act.type === 'create_role') actName = `Création du rôle <strong>"${act.name}"</strong>`;
            if (act.type === 'delete_role') actName = `Suppression du rôle`;
            if (act.type === 'update_automod') actName = `Mise à jour des filtres d'auto-modération`;
            if (act.type === 'add_badword') actName = `Ajout du mot interdit <strong>"${act.word}"</strong>`;
            responseText += `<li>${actName}</li>`;
          });
          responseText += `</ul></div>`;
          
          // Rafraîchir les configurations locales puisque des actions ont été prises
          loadGuildConfiguration();
        }

        botBubble.innerHTML = `
          <div style="width: 36px; height: 36px; background: #9b59b6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">🤖</div>
          <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 0 16px 16px 16px; font-size: 0.92rem; line-height: 1.5; color: #e1e1e1;">
            ${responseText}
          </div>
        `;
        aiChatMessages.appendChild(botBubble);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
      })
      .catch(err => {
        // Enlever la bulle d'écriture
        const tb = document.getElementById('ai-typing');
        if (tb) tb.remove();

        const botBubble = document.createElement('div');
        botBubble.className = 'ai-message-bubble ai-bot';
        botBubble.style.display = 'flex';
        botBubble.style.gap = '12px';
        botBubble.style.alignSelf = 'flex-start';
        botBubble.style.maxWidth = '80%';
        botBubble.innerHTML = `
          <div style="width: 36px; height: 36px; background: #e74c3c; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">⚠️</div>
          <div style="background: rgba(231,76,60,0.1); border: 1px solid rgba(231,76,60,0.2); padding: 12px 16px; border-radius: 0 16px 16px 16px; font-size: 0.92rem; line-height: 1.5; color: #ff8080;">
            ${err.message}
          </div>
        `;
        aiChatMessages.appendChild(botBubble);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
      });
    });
  }

  // Bouton de réinitialisation de la mémoire IA
  const btnResetAiChat = document.getElementById('btn-reset-ai-chat');
  if (btnResetAiChat) {
    btnResetAiChat.addEventListener('click', () => {
      fetch('/api/ai/reset', { method: 'POST' })
        .then(res => res.json())
        .then(() => {
          showToast('🧠 Mémoire de l\'assistant IA réinitialisée !');
          if (aiChatMessages) {
            aiChatMessages.innerHTML = `
              <div class="ai-message-bubble ai-bot" style="display: flex; gap: 12px; align-self: flex-start; max-width: 80%;">
                <div style="width: 36px; height: 36px; background: #9b59b6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">🤖</div>
                <div style="background: rgba(255,255,255,0.06); padding: 12px 16px; border-radius: 0 16px 16px 16px; font-size: 0.92rem; line-height: 1.5; color: #e1e1e1;">
                  Conversation réinitialisée ! 🔄<br><br>
                  <em>Je suis prêt pour de nouvelles instructions d'administration. Que souhaitez-vous faire ?</em>
                </div>
              </div>
            `;
          }
        })
        .catch(err => showToast(`Erreur : ${err.message}`, true));
    });
  }

  // Recherche dynamique dans le menu latéral
  const sidebarTabSearch = document.getElementById('sidebar-tab-search');
  if (sidebarTabSearch) {
    sidebarTabSearch.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const categories = document.querySelectorAll('.sidebar-category');

      categories.forEach(cat => {
        let hasVisibleBtn = false;
        const btns = cat.querySelectorAll('.tab-btn');

        btns.forEach(btn => {
          const text = btn.textContent.toLowerCase();
          if (!q || text.includes(q)) {
            btn.style.display = 'flex';
            hasVisibleBtn = true;
          } else {
            btn.style.display = 'none';
          }
        });

        const title = cat.querySelector('.category-title');
        if (title) {
          title.style.display = hasVisibleBtn ? 'flex' : 'none';
        }
      });
    });
  }

  // --- Role Themes Configuration ---
  function loadRoleThemes() {
    fetch('/api/config/role-themes')
      .then(res => res.json())
      .then(themes => {
        renderRoleThemes(themes);
      })
      .catch(console.error);
  }

  function renderRoleThemes(themes) {
    const roleThemesList = document.getElementById('role-themes-list');
    if (!roleThemesList) return;

    if (themes.length === 0) {
      roleThemesList.innerHTML = '<tr><td colspan="3" class="text-center">Aucun thème par rôle configuré.</td></tr>';
      return;
    }

    roleThemesList.innerHTML = '';
    themes.forEach(item => {
      const tr = document.createElement('tr');
      const roleName = rolesList.find(r => r.id === item.role_id)?.name || `<@&${item.role_id}>`;

      tr.innerHTML = `
        <td><span class="role-badge">${roleName}</span></td>
        <td><span class="badge badge-info" style="background: rgba(0, 210, 227, 0.15); color: #00d2d3; padding: 4px 10px; border-radius: 4px; font-weight: 500; font-size: 0.8rem;">${item.theme_name.toUpperCase()}</span></td>
        <td><button class="btn btn-danger btn-delete-theme" data-role-id="${item.role_id}" data-theme-name="${item.theme_name}"><i class="fa-solid fa-trash-can"></i> Supprimer</button></td>
      `;

      tr.querySelector('.btn-delete-theme').addEventListener('click', () => {
        deleteRoleTheme(item.role_id, item.theme_name);
      });

      roleThemesList.appendChild(tr);
    });
  }

  const formAddRoleTheme = document.getElementById('form-add-role-theme');
  if (formAddRoleTheme) {
    formAddRoleTheme.addEventListener('submit', (e) => {
      e.preventDefault();
      const role_id = document.getElementById('theme_role').value;
      const theme_name = document.getElementById('theme_name_select').value;

      if (!role_id || !theme_name) return;

      fetch('/api/config/role-themes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id, theme_name })
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            formAddRoleTheme.reset();
            const themeRoleSel = document.getElementById('theme_role');
            if (themeRoleSel && themeRoleSel.syncCustomSelect) themeRoleSel.syncCustomSelect();
            const themeNameSel = document.getElementById('theme_name_select');
            if (themeNameSel && themeNameSel.syncCustomSelect) themeNameSel.syncCustomSelect();
            
            loadRoleThemes();
            showToast('Thème associé au rôle avec succès !');
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        })
        .catch(err => showToast(err.message, true));
    });
  }

  function deleteRoleTheme(roleId, themeName) {
    if (!confirm('Voulez-vous vraiment supprimer cette association de thème ?')) return;

    fetch('/api/config/role-themes/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id: roleId, theme_name: themeName })
    })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          loadRoleThemes();
          showToast('Association de thème supprimée !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
  }

  // --- Émoji Picker pour Mot Caché ---
  let serverEmojis = [];

  function loadServerEmojis() {
    fetch('/api/emojis')
      .then(res => res.json())
      .then(emojis => {
        serverEmojis = emojis || [];
        renderEmojiPicker(document.getElementById('emoji-search-input')?.value || '');
      })
      .catch(err => {
        console.error('Erreur chargement émojis:', err);
        serverEmojis = [];
        renderEmojiPicker(document.getElementById('emoji-search-input')?.value || '');
      });
  }

  function renderEmojiPicker(searchQuery = '') {
    const grid = document.getElementById('emoji-picker-grid');
    if (!grid) return;

    grid.innerHTML = '';
    
    // Émojis standards par défaut
    const standardEmojis = ['🔍', '📝', '✨', '🏆', '🎉', '💡', '🔥', '🎲', '💬', '❤️', '⭐', '🚀', '🐱', '🐶', '🍕', '🍺', '👑', '💎', '🎨', '⚙️'];
    
    const filteredStandards = standardEmojis.filter(emoji => 
      emoji.includes(searchQuery) || searchQuery === ''
    );

    filteredStandards.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-select-emoji';
      btn.style = 'background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 4px; border-radius: 4px; transition: transform 0.1s; display: flex; align-items: center; justify-content: center;';
      btn.innerHTML = emoji;
      btn.title = emoji;
      
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.2)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1.0)');
      btn.addEventListener('click', () => {
        document.getElementById('game_letter_emoji').value = emoji;
        document.getElementById('emoji-picker-dropdown').style.display = 'none';
      });
      grid.appendChild(btn);
    });

    const queryLower = searchQuery.toLowerCase();
    const filteredServer = serverEmojis.filter(emoji => 
      emoji.name.toLowerCase().includes(queryLower)
    );

    filteredServer.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-select-emoji';
      btn.style = 'background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; transition: transform 0.1s; display: flex; align-items: center; justify-content: center;';
      btn.innerHTML = `<img src="${emoji.url}" alt="${emoji.name}" style="width: 28px; height: 28px; object-fit: contain;">`;
      btn.title = `:${emoji.name}:`;
      
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.2)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1.0)');
      btn.addEventListener('click', () => {
        document.getElementById('game_letter_emoji').value = emoji.identifier;
        document.getElementById('emoji-picker-dropdown').style.display = 'none';
      });
      grid.appendChild(btn);
    });

    if (filteredStandards.length === 0 && filteredServer.length === 0) {
      grid.innerHTML = '<div style="grid-column: span 5; color: #72767d; font-size: 0.8rem; text-align: center; padding: 10px 0;">Aucun émoji</div>';
    }
  }

  // Bind du bouton d'ouverture
  const btnEmojiPicker = document.getElementById('btn-open-emoji-picker');
  const divEmojiDropdown = document.getElementById('emoji-picker-dropdown');
  
  if (btnEmojiPicker && divEmojiDropdown) {
    btnEmojiPicker.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = divEmojiDropdown.style.display === 'block';
      divEmojiDropdown.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        const searchInput = document.getElementById('emoji-search-input');
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        loadServerEmojis();
      }
    });

    divEmojiDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      divEmojiDropdown.style.display = 'none';
    });

    const searchInput = document.getElementById('emoji-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderEmojiPicker(e.target.value);
      });
    }
  }

  // --- RENDERS ET GESTIONNAIRES IA MULTI-CLÉS ---

  function renderAiKeys(keys) {
    const tbody = document.getElementById('ai-keys-list-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (keys.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: #8e9297; padding: 15px; font-style: italic;">Aucune clé d\'API configurée. Le bot utilisera le service gratuit Pollinations AI.</td></tr>';
      return;
    }

    keys.forEach(k => {
      const tr = document.createElement('tr');

      const tdProvider = document.createElement('td');
      let providerBadge = '<span class="badge" style="background: rgba(230,126,34,0.2); color: #e67e22; padding: 4px 8px; border-radius: 4px; font-weight: bold;">⚡ Groq API</span>';
      if (k.provider === 'gemini') {
        providerBadge = '<span class="badge" style="background: rgba(52,152,219,0.2); color: #3498db; padding: 4px 8px; border-radius: 4px; font-weight: bold;">✨ Gemini API</span>';
      } else if (k.provider === 'ollama') {
        providerBadge = '<span class="badge" style="background: rgba(155,89,182,0.2); color: #9b59b6; padding: 4px 8px; border-radius: 4px; font-weight: bold;">🏠 Ollama Local</span>';
      }
      tdProvider.innerHTML = providerBadge;

      const tdCategory = document.createElement('td');
      let catText = '🌐 Tous les générateurs';
      if (k.category === 'text') catText = '💬 Texte (Actions/Chat)';
      if (k.category === 'vision') catText = '👁️ Vision (Images)';
      if (k.category === 'server') catText = '🛡️ Gestion Serveur';
      tdCategory.textContent = catText;

      const tdLabel = document.createElement('td');
      tdLabel.innerHTML = `<strong>${k.label || 'Sans nom'}</strong>`;

      const tdKey = document.createElement('td');
      const masked = k.api_key ? (k.api_key.substring(0, 7) + '...' + k.api_key.substring(k.api_key.length - 4)) : '***';
      tdKey.innerHTML = `<code>${masked}</code>`;

      const tdStatus = document.createElement('td');
      if (k.is_active === 1) {
        tdStatus.innerHTML = '<span style="color:#2ecc71; font-weight: bold;">🟢 Actif</span>';
      } else {
        tdStatus.innerHTML = '<span style="color:#e74c3c; font-weight: bold;">🔴 Inactif</span>';
      }

      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'center';
      tdActions.style.display = 'flex';
      tdActions.style.gap = '5px';
      tdActions.style.justifyContent = 'center';

      const btnEdit = document.createElement('button');
      btnEdit.type = 'button';
      btnEdit.className = 'btn-delete-gif';
      btnEdit.style.background = '#9b59b6';
      btnEdit.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
      btnEdit.title = 'Modifier l\'usage ou les infos de cette clé';
      btnEdit.addEventListener('click', () => {
        document.getElementById('ai_key_id').value = k.id;
        document.getElementById('ai_key_provider').value = k.provider;
        document.getElementById('ai_key_category').value = k.category || 'all';
        document.getElementById('ai_key_label').value = k.label || '';
        document.getElementById('ai_key_val').value = '';
        document.getElementById('ai_key_val').placeholder = 'Inchangée (' + (k.api_key ? k.api_key.substring(0, 6) + '...' : '') + ')';
        
        ['ai_key_provider', 'ai_key_category'].forEach(id => {
          const el = document.getElementById(id);
          if (el && el.syncCustomSelect) el.syncCustomSelect();
        });

        const titleEl = document.getElementById('ai-key-form-title');
        if (titleEl) titleEl.textContent = `Modifier la Clé API "${k.label || 'Sans nom'}"`;
        
        const btnSubmit = document.getElementById('btn-submit-ai-key');
        if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer les modifications';

        const btnCancel = document.getElementById('btn-cancel-ai-key-edit');
        if (btnCancel) btnCancel.style.display = 'inline-flex';

        document.getElementById('form-add-ai-key').scrollIntoView({ behavior: 'smooth' });
      });

      const btnToggle = document.createElement('button');
      btnToggle.type = 'button';
      btnToggle.className = 'btn-delete-gif';
      btnToggle.style.background = k.is_active === 1 ? '#e67e22' : '#2ecc71';
      btnToggle.innerHTML = k.is_active === 1 ? '<i class="fa-solid fa-power-off"></i>' : '<i class="fa-solid fa-check"></i>';
      btnToggle.title = k.is_active === 1 ? 'Désactiver cette clé' : 'Activer cette clé';
      btnToggle.addEventListener('click', () => {
        fetch('/api/config/ai/keys/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: k.id, is_active: k.is_active === 1 ? 0 : 1 })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('Statut de la clé mis à jour !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        });
      });

      const btnTest = document.createElement('button');
      btnTest.type = 'button';
      btnTest.className = 'btn-delete-gif';
      btnTest.style.background = '#3498db';
      btnTest.innerHTML = '<i class="fa-solid fa-vial"></i>';
      btnTest.title = 'Tester la validité de cette clé';
      btnTest.addEventListener('click', () => {
        showToast(`Test de la clé ${k.label}...`);
        fetch('/api/config/ai/keys/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider: k.provider, api_key: k.api_key })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast(resData.message);
          } else {
            showToast('Test échoué : ' + resData.error, true);
          }
        });
      });

      const btnDel = document.createElement('button');
      btnDel.type = 'button';
      btnDel.className = 'btn-delete-gif';
      btnDel.innerHTML = '<i class="fa-solid fa-trash"></i>';
      btnDel.title = 'Supprimer cette clé';
      btnDel.addEventListener('click', () => {
        if (!confirm(`Supprimer la clé "${k.label}" ?`)) return;
        fetch('/api/config/ai/keys/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: k.id })
        })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('Clé supprimée avec succès !');
            loadGuildConfiguration();
          } else {
            showToast('Erreur: ' + resData.error, true);
          }
        });
      });

      tdActions.appendChild(btnEdit);
      tdActions.appendChild(btnToggle);
      tdActions.appendChild(btnTest);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdProvider);
      tr.appendChild(tdCategory);
      tr.appendChild(tdLabel);
      tr.appendChild(tdKey);
      tr.appendChild(tdStatus);
      tr.appendChild(tdActions);

      tbody.appendChild(tr);
    });
  }

  function resetAiKeyForm() {
    const keyIdInput = document.getElementById('ai_key_id');
    if (keyIdInput) keyIdInput.value = '';
    const form = document.getElementById('form-add-ai-key');
    if (form) form.reset();
    const valInput = document.getElementById('ai_key_val');
    if (valInput) valInput.placeholder = 'gsk_... ou AIzaSy...';
    
    ['ai_key_provider', 'ai_key_category'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.syncCustomSelect) el.syncCustomSelect();
    });

    const titleEl = document.getElementById('ai-key-form-title');
    if (titleEl) titleEl.textContent = 'Ajouter une Clé d\'API (Multi-Clés Pool)';
    
    const btnSubmit = document.getElementById('btn-submit-ai-key');
    if (btnSubmit) btnSubmit.innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter la Clé au Pool';

    const btnCancel = document.getElementById('btn-cancel-ai-key-edit');
    if (btnCancel) btnCancel.style.display = 'none';
  }

  const btnCancelAiKeyEdit = document.getElementById('btn-cancel-ai-key-edit');
  if (btnCancelAiKeyEdit) {
    btnCancelAiKeyEdit.addEventListener('click', resetAiKeyForm);
  }

  const formAiConfig = document.getElementById('form-ai-config');
  if (formAiConfig) {
    formAiConfig.addEventListener('submit', (e) => {
      e.preventDefault();
      const body = {
        preferred_provider: document.getElementById('ai_preferred_provider').value,
        groq_text_model: document.getElementById('ai_groq_text_model').value,
        groq_vision_model: document.getElementById('ai_groq_vision_model').value,
        groq_server_model: document.getElementById('ai_groq_server_model').value,
        gemini_model: document.getElementById('ai_gemini_model').value
      };

      fetch('/api/config/ai/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast('Modèles et préférences IA enregistrés !');
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
    });
  }

  const formAddAiKey = document.getElementById('form-add-ai-key');
  if (formAddAiKey) {
    formAddAiKey.addEventListener('submit', (e) => {
      e.preventDefault();
      const keyId = document.getElementById('ai_key_id').value;
      const body = {
        provider: document.getElementById('ai_key_provider').value,
        category: document.getElementById('ai_key_category').value,
        label: document.getElementById('ai_key_label').value,
        api_key: document.getElementById('ai_key_val').value
      };
      if (keyId) body.id = keyId;

      const url = keyId ? '/api/config/ai/keys/update' : '/api/config/ai/keys/add';

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(keyId ? 'Clé d\'API modifiée avec succès !' : 'Clé d\'API ajoutée avec succès au pool !');
          resetAiKeyForm();
          loadGuildConfiguration();
        } else {
          showToast('Erreur: ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
    });
  }

  const btnTestAiKeyInput = document.getElementById('btn-test-ai-key-input');
  if (btnTestAiKeyInput) {
    btnTestAiKeyInput.addEventListener('click', () => {
      const provider = document.getElementById('ai_key_provider').value;
      const api_key = document.getElementById('ai_key_val').value;
      if (!api_key) {
        showToast('Veuillez d\'abord saisir une clé d\'API dans le champ.', true);
        return;
      }
      showToast('Test de la clé en cours...');
      fetch('/api/config/ai/keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, api_key })
      })
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          showToast(resData.message);
        } else {
          showToast('Test échoué : ' + resData.error, true);
        }
      })
      .catch(err => showToast(err.message, true));
    });
  }

  // --- STAR DE LA SEMAINE (DASHBOARD) ---
  function loadStarConfigAndLeaderboard() {
    fetch('/api/star/config')
      .then(res => res.json())
      .then(config => {
        if (!config) return;
        document.getElementById('star_is_active').value = config.is_active !== undefined ? config.is_active : 1;
        document.getElementById('star_announce_channel_id').value = config.announce_channel_id || '';
        document.getElementById('star_star_role_id').value = config.star_role_id || '';
        document.getElementById('star_reward_coins').value = config.reward_coins !== undefined ? config.reward_coins : 1000;
        document.getElementById('star_reward_karma').value = config.reward_karma !== undefined ? config.reward_karma : 50;
        document.getElementById('star_election_day').value = config.election_day !== undefined ? config.election_day : 0;
        document.getElementById('star_election_hour').value = config.election_hour !== undefined ? config.election_hour : 23;

        document.getElementById('star_points_normal').value = config.points_normal !== undefined ? config.points_normal : 1;
        document.getElementById('star_points_nsfw').value = config.points_nsfw !== undefined ? config.points_nsfw : 2;
        document.getElementById('star_points_selfie').value = config.points_selfie !== undefined ? config.points_selfie : 3;
        document.getElementById('star_points_nude').value = config.points_nude !== undefined ? config.points_nude : 5;

        // Populate Multi-Select Selfie Channels
        const selfieSelect = document.getElementById('star_selfie_channels');
        if (selfieSelect) {
          const selectedSelfies = config.selfie_channels ? config.selfie_channels.split(',') : [];
          Array.from(selfieSelect.options).forEach(opt => {
            opt.selected = selectedSelfies.includes(opt.value);
          });
        }

        // Populate Multi-Select Nude Channels
        const nudeSelect = document.getElementById('star_nude_channels');
        if (nudeSelect) {
          const selectedNudes = config.nude_channels ? config.nude_channels.split(',') : [];
          Array.from(nudeSelect.options).forEach(opt => {
            opt.selected = selectedNudes.includes(opt.value);
          });
        }

        document.getElementById('star_announce_title').value = config.announce_title || '⭐ Star de la Semaine !';
        document.getElementById('star_announce_color').value = config.announce_color || '#f1c40f';
        document.getElementById('star_announce_desc').value = config.announce_desc || 'Félicitations à {user} qui devient la **Star de la Semaine** avec **{points} points** ! 🌟\n\nIl/Elle remporte le rôle {role} et brille sur le serveur !';
        document.getElementById('star_announce_image').value = config.announce_image || '';
      })
      .catch(console.error);

    fetch('/api/star/leaderboard')
      .then(res => res.json())
      .then(data => {
        const winnerBanner = document.getElementById('star-current-winner-banner');
        if (winnerBanner) {
          if (data.currentStar) {
            winnerBanner.style.display = 'flex';
            winnerBanner.innerHTML = `
              <div style="font-size: 2rem;">👑</div>
              <div>
                <h4 style="margin: 0; color: #f1c40f;">Star Actuelle du Serveur</h4>
                <p style="margin: 3px 0 0 0; color: #e1e1e1; font-weight: 600;">${data.currentStar.displayName} (${data.currentStar.userId})</p>
              </div>
            `;
          } else {
            winnerBanner.style.display = 'none';
          }
        }

        const tbody = document.getElementById('star-leaderboard-tbody');
        if (tbody) {
          tbody.innerHTML = '';
          if (!data.leaderboard || data.leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #8e9297; padding: 20px;">Aucun point accumulé cette semaine. Envoyez des messages sur Discord pour apparaître dans le classement !</td></tr>';
          } else {
            const medals = ['🥇', '🥈', '🥉'];
            data.leaderboard.forEach((r, i) => {
              const tr = document.createElement('tr');
              const rankStr = medals[i] || `#${i + 1}`;
              tr.innerHTML = `
                <td><strong style="font-size: 1.1rem;">${rankStr}</strong></td>
                <td><strong>${r.displayName}</strong></td>
                <td><span style="background: rgba(241,196,15,0.2); color: #f1c40f; padding: 4px 10px; border-radius: 12px; font-weight: bold;">${r.points} pts</span></td>
                <td>${r.normal_count || 0}</td>
                <td>${r.nsfw_count || 0}</td>
                <td>${r.selfie_count || 0}</td>
                <td>${r.nude_count || 0}</td>
              `;
              tbody.appendChild(tr);
            });
          }
        }
      })
      .catch(console.error);
  }

  const formStarConfig = document.getElementById('form-star-config');
  if (formStarConfig) {
    formStarConfig.addEventListener('submit', (e) => {
      e.preventDefault();

      const selfieSelect = document.getElementById('star_selfie_channels');
      const selectedSelfieChannels = selfieSelect ? Array.from(selfieSelect.selectedOptions).map(o => o.value) : [];

      const nudeSelect = document.getElementById('star_nude_channels');
      const selectedNudeChannels = nudeSelect ? Array.from(nudeSelect.selectedOptions).map(o => o.value) : [];

      const payload = {
        is_active: document.getElementById('star_is_active').value,
        announce_channel_id: document.getElementById('star_announce_channel_id').value,
        star_role_id: document.getElementById('star_star_role_id').value,
        reward_coins: document.getElementById('star_reward_coins').value,
        reward_karma: document.getElementById('star_reward_karma').value,
        election_day: document.getElementById('star_election_day').value,
        election_hour: document.getElementById('star_election_hour').value,
        points_normal: document.getElementById('star_points_normal').value,
        points_nsfw: document.getElementById('star_points_nsfw').value,
        points_selfie: document.getElementById('star_points_selfie').value,
        points_nude: document.getElementById('star_points_nude').value,
        selfie_channels: selectedSelfieChannels,
        nude_channels: selectedNudeChannels,
        announce_title: document.getElementById('star_announce_title').value,
        announce_color: document.getElementById('star_announce_color').value,
        announce_desc: document.getElementById('star_announce_desc').value,
        announce_image: document.getElementById('star_announce_image').value
      };

      fetch('/api/star/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            showToast('✅ Configuration Star de la Semaine enregistrée avec succès !');
          } else {
            showToast(`❌ Erreur : ${data.error}`, true);
          }
        })
        .catch(err => {
          showToast(`❌ Erreur réseau : ${err.message}`, true);
        });
    });
  }

  const btnUploadStarImage = document.getElementById('btn-upload-star-image');
  const fileUploadStarImage = document.getElementById('file-upload-star-image');
  if (btnUploadStarImage && fileUploadStarImage) {
    btnUploadStarImage.addEventListener('click', () => fileUploadStarImage.click());
    fileUploadStarImage.addEventListener('change', () => {
      const file = fileUploadStarImage.files[0];
      if (!file) return;
      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            document.getElementById('star_announce_image').value = data.url;
            showToast('✅ Image téléversée avec succès !');
          } else {
            showToast(`❌ Erreur d'upload : ${data.error}`, true);
          }
        })
        .catch(err => showToast(`❌ Erreur réseau : ${err.message}`, true));
    });
  }

  const btnForceStarElection = document.getElementById('btn-force-star-election');
  if (btnForceStarElection) {
    btnForceStarElection.addEventListener('click', () => {
      if (!confirm('Êtes-vous sûr de vouloir forcer l\'élection de la Star de la Semaine maintenant ? L\'annonce sera envoyée sur Discord et le rôle sera réattribué.')) return;

      btnForceStarElection.disabled = true;
      btnForceStarElection.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Élection en cours...';

      fetch('/api/star/force-election', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
        .then(res => res.json())
        .then(data => {
          btnForceStarElection.disabled = false;
          btnForceStarElection.innerHTML = '<i class="fa-solid fa-bolt"></i> Forcer l\'Élection Maintenant';

          if (data.success) {
            showToast(`🎉 Élection réussie ! La nouvelle Star est élue avec ${data.result.points} points.`);
            loadStarConfigAndLeaderboard();
          } else {
            showToast(`❌ ${data.error}`, true);
          }
        })
        .catch(err => {
          btnForceStarElection.disabled = false;
          btnForceStarElection.innerHTML = '<i class="fa-solid fa-bolt"></i> Forcer l\'Élection Maintenant';
          showToast(`❌ Erreur réseau : ${err.message}`, true);
        });
    });
  }

  // --- GESTION DES COMMANDES & PERMISSIONS ---
  let allCommandPermissions = [];
  let serverRolesForCmdPerms = [];

  function loadCommandPermissions() {
    const container = document.getElementById('cmd-permissions-container');
    const catSelect = document.getElementById('cmd-perm-category-filter');
    if (!container) return;

    fetch('/api/roles')
      .then(res => res.json())
      .then(roles => {
        serverRolesForCmdPerms = Array.isArray(roles) ? roles : [];
        return fetch('/api/config/command-permissions');
      })
      .then(res => res.json())
      .then(commands => {
        if (!Array.isArray(commands)) {
          container.innerHTML = '<p class="error-msg">Impossible de charger la liste des commandes.</p>';
          return;
        }

        allCommandPermissions = commands;

        const categories = [...new Set(commands.map(c => c.category))].sort();
        if (catSelect) {
          catSelect.innerHTML = '<option value="ALL">Toutes les catégories</option>' + 
            categories.map(cat => `<option value="${cat}">${cat.toUpperCase()}</option>`).join('');
        }

        renderCommandPermissionsList();
      })
      .catch(err => {
        console.error(err);
        container.innerHTML = '<p class="error-msg">Erreur lors de la récupération des commandes.</p>';
      });
  }

  function renderCommandPermissionsList() {
    const container = document.getElementById('cmd-permissions-container');
    const searchVal = (document.getElementById('cmd-perm-search')?.value || '').toLowerCase().trim();
    const catVal = document.getElementById('cmd-perm-category-filter')?.value || 'ALL';

    if (!container) return;

    let filtered = allCommandPermissions.filter(cmd => {
      if (!cmd) return false;
      const cName = String(cmd.name || '').toLowerCase();
      const cDesc = String(cmd.description || '').toLowerCase();
      const cCat = String(cmd.category || '').toLowerCase();

      const matchSearch = cName.includes(searchVal) || cDesc.includes(searchVal) || cCat.includes(searchVal);
      const matchCat = catVal === 'ALL' || cmd.category === catVal;
      return matchSearch && matchCat;
    });

    function catCatVal(cmd, catVal) {
      return catVal === 'ALL' ? cmd.category : catVal;
    }

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:30px; color:#8e9297;">Aucune commande ne correspond à votre recherche.</div>';
      return;
    }

    let html = '';
    filtered.forEach(cmd => {
      const isEnabled = cmd.enabled;
      const configuredAllowedRoles = serverRolesForCmdPerms.filter(r => cmd.allowed_roles.includes(r.id));

      const catLower = (cmd.category || '').toLowerCase();
      const nameLower = (cmd.name || '').toLowerCase();

      const isAdminOrModCategory = ['administration', 'modération', 'sécurité', 'admin', 'moderation', 'config', 'support'].some(c => catLower.includes(c));
      const isAdminOrModCommandName = ['admin', 'ban', 'kick', 'unban', 'clear', 'quarantaine', 'automod', 'logs', 'embed', 'ticket', 'panel', 'config', 'setup', 'eval', 'reload', 'lock', 'unlock', 'mute', 'unmute', 'timeout', 'untimeout', 'warn', 'unwarn'].some(n => nameLower.includes(n));

      const isDefaultAdminCmd = (isAdminOrModCategory || isAdminOrModCommandName) && nameLower !== 'tribunal';

      let accessBadge = '';
      if (isDefaultAdminCmd) {
        if (cmd.allowed_roles.length === 0) {
          accessBadge = '<span class="discord-perm-badge badge-admin"><i class="fa-solid fa-lock"></i> Reservé aux Administrateurs</span>';
        } else {
          accessBadge = `<span class="discord-perm-badge badge-restricted"><i class="fa-solid fa-shield-halved"></i> Admins + ${cmd.allowed_roles.length} rôle(s) en dérogation</span>`;
        }
      } else {
        accessBadge = '<span class="discord-perm-badge badge-everyone"><i class="fa-solid fa-earth-americas"></i> Accessible à tout le monde</span>';
      }

      html += `
        <div class="discord-integration-card ${isEnabled ? 'enabled' : 'disabled'}" data-cmd="${cmd.name}">
          
          <!-- Card Header -->
          <div class="discord-card-header">
            <div class="discord-cmd-info">
              <div class="discord-cmd-title-row">
                <span class="discord-cmd-name">/${cmd.name}</span>
                <span class="discord-category-tag">${cmd.category}</span>
                <span class="access-badge-container">${accessBadge}</span>
              </div>
              <p class="discord-cmd-desc">${cmd.description || 'Aucune description'}</p>
            </div>

            <div class="discord-card-actions">
              <label class="switch-label" style="margin: 0;">
                <input type="checkbox" class="cmd-toggle-enabled" data-cmd="${cmd.name}" ${isEnabled ? 'checked' : ''}>
                <span class="slider"></span>
              </label>

              <button class="btn btn-save btn-sm btn-save-cmd-perm" data-cmd="${cmd.name}">
                <i class="fa-solid fa-floppy-disk"></i> Enregistrer
              </button>
            </div>
          </div>

          <!-- Card Content -->
          <div class="discord-card-body" style="grid-template-columns: 1fr;">
            
            ${isDefaultAdminCmd ? `
              <!-- Dérogations pour Commandes Admins -->
              <div class="discord-perm-column" data-type="allowed">
                <div class="discord-perm-header">
                  <span class="perm-title allowed"><i class="fa-solid fa-user-shield"></i> Rôles autorisés en dérogation (Staff / Modos)</span>
                  <span class="perm-hint allowed-hint">${cmd.allowed_roles.length === 0 ? 'Admins uniquement' : `${cmd.allowed_roles.length} rôle(s) en dérogation`}</span>
                </div>

                <div class="discord-role-badges-list allowed-badges">
                  ${configuredAllowedRoles.length > 0 ? configuredAllowedRoles.map(r => `
                    <span class="discord-role-pill" style="border-color: ${r.color && r.color !== '#000000' ? r.color : '#5865f2'};">
                      <span class="role-dot" style="background: ${r.color && r.color !== '#000000' ? r.color : '#99aab5'};"></span>
                      <span class="role-name">${r.name}</span>
                      <i class="fa-solid fa-xmark remove-role-btn" data-role-id="${r.id}" data-type="allowed" title="Retirer ce rôle"></i>
                    </span>
                  `).join('') : '<span class="empty-roles-text">🔒 Administrateurs du serveur uniquement (Aucune dérogation ajoutée)</span>'}
                </div>

                <div class="custom-string-select-container" data-cmd="${cmd.name}" data-type="allowed" style="position: relative; margin-top: 10px;">
                  <button type="button" class="cmd-select-trigger discord-add-role-btn">
                    <span><i class="fa-solid fa-plus"></i> Accorder une dérogation à un rôle (ex: Modérateur, Helper...)</span>
                    <i class="fa-solid fa-chevron-down arrow-icon"></i>
                  </button>

                  <div class="cmd-select-dropdown discord-dropdown-panel" style="display: none;">
                    <div class="discord-search-box">
                      <i class="fa-solid fa-magnifying-glass"></i>
                      <input type="text" class="cmd-internal-search-input" placeholder="🔍 Rechercher un rôle à autoriser...">
                    </div>

                    <div class="cmd-options-scroll-list">
                      ${serverRolesForCmdPerms.map(r => {
                        const isChecked = cmd.allowed_roles.includes(r.id);
                        return `
                          <label class="cmd-option-item">
                            <input type="checkbox" class="cmd-allowed-checkbox" value="${r.id}" ${isChecked ? 'checked' : ''}>
                            <span class="role-dot" style="background: ${r.color && r.color !== '#000000' ? r.color : '#99aab5'};"></span>
                            <span class="role-label" style="color: ${r.color && r.color !== '#000000' ? r.color : '#fff'}; font-weight: 600;">${r.name}</span>
                          </label>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Commande Publique -->
              <div style="background: rgba(46, 204, 113, 0.05); border: 1px solid rgba(46, 204, 113, 0.15); padding: 12px 16px; border-radius: 8px; font-size: 0.88rem; color: #2ecc71; display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fa-solid fa-globe" style="margin-right: 8px;"></i> Commande publique : Accessible par tous les membres du serveur.</span>
              </div>
            `}

          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Gestion dynamique des cartes d'intégration Discord
    container.querySelectorAll('.discord-integration-card').forEach(card => {
      const isDefaultAdminCmd = card.querySelector('.badge-admin') !== null || card.querySelector('.badge-restricted') !== null;

      const updateColumnBadges = (type) => {
        const col = card.querySelector(`.discord-perm-column[data-type="${type}"]`);
        if (!col) return;
        const badgesContainer = col.querySelector(`.discord-role-badges-list`);
        const hintSpan = col.querySelector(`.perm-hint`);
        const checkedCheckboxes = col.querySelectorAll(`input[type="checkbox"]:checked`);

        const selectedRoleIds = Array.from(checkedCheckboxes).map(cb => cb.value);
        const rolesObj = serverRolesForCmdPerms.filter(r => selectedRoleIds.includes(r.id));

        hintSpan.textContent = rolesObj.length === 0 ? 'Admins uniquement' : `${rolesObj.length} rôle(s) en dérogation`;
        
        if (rolesObj.length === 0) {
          badgesContainer.innerHTML = '<span class="empty-roles-text">🔒 Administrateurs du serveur uniquement (Aucune dérogation ajoutée)</span>';
        } else {
          badgesContainer.innerHTML = rolesObj.map(r => `
            <span class="discord-role-pill" style="border-color: ${r.color && r.color !== '#000000' ? r.color : '#5865f2'};">
              <span class="role-dot" style="background: ${r.color && r.color !== '#000000' ? r.color : '#99aab5'};"></span>
              <span class="role-name">${r.name}</span>
              <i class="fa-solid fa-xmark remove-role-btn" data-role-id="${r.id}" data-type="allowed" title="Retirer cette dérogation"></i>
            </span>
          `).join('');
        }

        // Met à jour le badge d'accès principal en haut de carte
        const allowedCount = rolesObj.length;
        const badgeContainer = card.querySelector('.access-badge-container');
        if (badgeContainer) {
          if (allowedCount === 0) {
            badgeContainer.innerHTML = '<span class="discord-perm-badge badge-admin"><i class="fa-solid fa-lock"></i> Reservé aux Administrateurs</span>';
          } else {
            badgeContainer.innerHTML = `<span class="discord-perm-badge badge-restricted"><i class="fa-solid fa-shield-halved"></i> Admins + ${allowedCount} rôle(s) en dérogation</span>`;
          }
        }

        // Attacher le clic sur la croix des badges pour retirer la dérogation
        col.querySelectorAll('.remove-role-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const rId = btn.getAttribute('data-role-id');
            const targetCb = col.querySelector(`input[value="${rId}"]`);
            if (targetCb) {
              targetCb.checked = false;
              updateColumnBadges(type);
            }
          });
        });
      };

      // Gestion de l'ouverture/fermeture et recherche dans les StringSelect
      card.querySelectorAll('.custom-string-select-container').forEach(selContainer => {
        const trigger = selContainer.querySelector('.cmd-select-trigger');
        const dropdown = selContainer.querySelector('.cmd-select-dropdown');
        const searchInput = selContainer.querySelector('.cmd-internal-search-input');
        const items = selContainer.querySelectorAll('.cmd-option-item');
        const checkboxes = selContainer.querySelectorAll('input[type="checkbox"]');
        const type = selContainer.getAttribute('data-type');

        trigger.addEventListener('click', (e) => {
          e.stopPropagation();
          const isOpen = dropdown.style.display === 'block';
          document.querySelectorAll('.cmd-select-dropdown').forEach(d => d.style.display = 'none');
          dropdown.style.display = isOpen ? 'none' : 'block';
          if (!isOpen) searchInput.focus();
        });

        dropdown.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        searchInput.addEventListener('input', (e) => {
          const query = e.target.value.toLowerCase().trim();
          items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(query) ? 'flex' : 'none';
          });
        });

        checkboxes.forEach(chk => {
          chk.addEventListener('change', () => {
            updateColumnBadges(type);
          });
        });

        // Initialisation des listeners sur les croix de retrait
        updateColumnBadges(type);
      });
    });

    document.addEventListener('click', () => {
      document.querySelectorAll('.cmd-select-dropdown').forEach(d => d.style.display = 'none');
    });

    container.querySelectorAll('.btn-save-cmd-perm').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmdName = btn.getAttribute('data-cmd');
        const card = btn.closest('.discord-integration-card');
        const isEnabled = card.querySelector('.cmd-toggle-enabled').checked;
        
        const allowedCheckboxes = card.querySelectorAll('.cmd-allowed-checkbox:checked');
        const allowedRoles = Array.from(allowedCheckboxes).map(c => c.value);

        const deniedCheckboxes = card.querySelectorAll('.cmd-denied-checkbox:checked');
        const deniedRoles = Array.from(deniedCheckboxes).map(c => c.value);

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sauvegarde...';

        fetch('/api/config/command-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command_name: cmdName,
            enabled: isEnabled,
            allowed_roles: allowedRoles,
            denied_roles: deniedRoles
          })
        })
          .then(res => res.json())
          .then(data => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer';
            if (data.success) {
              showToast(`✅ Permissions de /${cmdName} enregistrées !`);
            } else {
              showToast(`❌ Erreur : ${data.error}`, true);
            }
          })
          .catch(err => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Enregistrer';
            showToast(`❌ Erreur réseau : ${err.message}`, true);
          });
      });
    });
  }

  const cmdSearchInput = document.getElementById('cmd-perm-search');
  const cmdCatSelect = document.getElementById('cmd-perm-category-filter');
  if (cmdSearchInput) {
    cmdSearchInput.addEventListener('input', renderCommandPermissionsList);
  }
  if (cmdCatSelect) {
    cmdCatSelect.addEventListener('change', renderCommandPermissionsList);
  }

  const tabCmdBtn = document.querySelector('[data-tab="tab-cmd-permissions"]');
  if (tabCmdBtn) {
    tabCmdBtn.addEventListener('click', loadCommandPermissions);
  }

  // --- SYSTEME DE QUETES & MISSIONS ---
  function loadQuestsConfig() {
    const container = document.getElementById('quests-list-container');
    if (!container) return;

    fetch('/api/config/quests')
      .then(res => res.json())
      .then(quests => {
        if (!Array.isArray(quests) || quests.length === 0) {
          container.innerHTML = '<div style="text-align:center; padding:30px; color:#8e9297;">Aucune quête créée pour le moment. Remplissez le formulaire ci-dessus pour ajouter votre première quête !</div>';
          return;
        }

        let html = '';
        quests.forEach(q => {
          let typeLabel = '💬 Messages';
          if (q.quest_type === 'reactions') typeLabel = '⭐ Réactions';
          else if (q.quest_type === 'confession') typeLabel = '🤫 Confessions Anonymes';
          else if (q.quest_type === 'photo_selfie') typeLabel = '🤳 Photo Selfie';
          else if (q.quest_type === 'photo_nude') typeLabel = '🔞 Photo NSFW / Nude';
          else if (q.quest_type === 'photo_outfit') typeLabel = '👗 Photo Outfit / Tenue';
          else if (q.quest_type === 'custom') typeLabel = '🎯 Action Spéciale';

          let rewards = [];
          if (q.reward_money > 0) rewards.push(`💰 +${q.reward_money} pièces`);
          if (q.reward_xp > 0) rewards.push(`⚡ +${q.reward_xp} XP`);
          if (q.reward_karma > 0) rewards.push(`⭐ +${q.reward_karma} Karma`);
          if (q.reward_chance > 0) rewards.push(`🍀 +${q.reward_chance} Chance(s)`);

          html += `
            <div class="card glass" style="padding: 18px 22px; margin-bottom: 12px; border-left: 4px solid ${q.enabled ? '#f1c40f' : '#8e9297'};">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-size: 1.1rem; font-weight: 700; color: #fff;">${q.title}</span>
                  <span style="background: rgba(241,196,15,0.2); color: #f1c40f; padding: 3px 10px; border-radius: 12px; font-size: 0.78rem; font-weight: 600; margin-left: 8px;">${typeLabel}</span>
                  <p style="margin: 4px 0 0 0; color: #b9bbbe; font-size: 0.88rem;">${q.description || 'Aucune description'}</p>
                </div>

                <div style="display: flex; align-items: center; gap: 12px;">
                  <button class="btn btn-danger btn-sm btn-delete-quest" data-id="${q.id}">
                    <i class="fa-solid fa-trash"></i> Supprimer
                  </button>
                </div>
              </div>

              <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); font-size: 0.85rem; color: #dcddde;">
                <div>🎯 <strong>Objectif :</strong> ${q.target_count} action(s)</div>
                <div>🏆 <strong>Récompenses :</strong> ${rewards.length > 0 ? rewards.join(' • ') : 'Aucune'}</div>
                <div>📌 <strong>Salons :</strong> ${q.channel_ids && q.channel_ids.length > 0 ? q.channel_ids.map(id => `<#${id}>`).join(', ') : 'Tous les salons'}</div>
              </div>
            </div>
          `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.btn-delete-quest').forEach(btn => {
          btn.addEventListener('click', () => {
            const qId = btn.getAttribute('data-id');
            if (!confirm('Voulez-vous vraiment supprimer cette quête ?')) return;

            fetch('/api/config/quests/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: qId })
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  showToast('✅ Quête supprimée avec succès !');
                  loadQuestsConfig();
                } else {
                  showToast(`❌ Erreur : ${data.error}`, true);
                }
              })
              .catch(err => showToast(`❌ Erreur réseau : ${err.message}`, true));
          });
        });
      })
      .catch(err => {
        console.error(err);
        container.innerHTML = '<p class="error-msg">Erreur lors de la récupération des quêtes.</p>';
      });
  }

  const formAddQuest = document.getElementById('form-add-quest');
  if (formAddQuest) {
    formAddQuest.addEventListener('submit', (e) => {
      e.preventDefault();

      const selectedChannels = Array.from(document.getElementById('quest_channel_ids').selectedOptions).map(o => o.value);

      const data = {
        title: document.getElementById('quest_title').value,
        quest_type: document.getElementById('quest_type').value,
        target_count: parseInt(document.getElementById('quest_target_count').value) || 1,
        description: document.getElementById('quest_description').value,
        channel_ids: selectedChannels,
        reward_role_id: document.getElementById('quest_reward_role_id').value || null,
        reward_money: parseInt(document.getElementById('quest_reward_money').value) || 0,
        reward_xp: parseInt(document.getElementById('quest_reward_xp').value) || 0,
        reward_karma: parseInt(document.getElementById('quest_reward_karma').value) || 0,
        reward_chance: parseInt(document.getElementById('quest_reward_chance')?.value || '0') || 0
      };

      fetch('/api/config/quests/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(res => res.json())
        .then(resData => {
          if (resData.success) {
            showToast('✅ Quête ajoutée avec succès !');
            formAddQuest.reset();
            loadQuestsConfig();
          } else {
            showToast(`❌ Erreur : ${resData.error}`, true);
          }
        })
        .catch(err => showToast(`❌ Erreur réseau : ${err.message}`, true));
    });
  }

  const tabQuestsBtn = document.querySelector('[data-tab="tab-quests"]');
  if (tabQuestsBtn) {
    tabQuestsBtn.addEventListener('click', loadQuestsConfig);
  }

  function initializeSearchableSelects() {
    document.querySelectorAll('select.custom-select, select.channel-select, select.role-select, select.announce-channel-select, select.category-select').forEach(select => {
      if (select.syncCustomSelect) {
        try { select.syncCustomSelect(); } catch (e) {}
      }
    });
  }

  initializeSearchableSelects();

  const btnSendFeatures = document.getElementById('btn-send-features-embed');
  if (btnSendFeatures) {
    btnSendFeatures.addEventListener('click', () => {
      const channelSelect = document.getElementById('announce_channel_select');
      const channelId = channelSelect ? channelSelect.value : null;
      if (!channelId) {
        showToast('⚠️ Veuillez choisir un salon de destination.', true);
        return;
      }

      fetch('/api/config/announce-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('✅ Embed de présentation des fonctionnalités envoyé !');
        } else {
          showToast(`❌ Erreur : ${data.error}`, true);
        }
      })
      .catch(err => showToast(`❌ Erreur réseau : ${err.message}`, true));
    });
  }

  const btnSendCommands = document.getElementById('btn-send-commands-embed');
  if (btnSendCommands) {
    btnSendCommands.addEventListener('click', () => {
      const channelSelect = document.getElementById('announce_channel_select');
      const channelId = channelSelect ? channelSelect.value : null;
      if (!channelId) {
        showToast('⚠️ Veuillez choisir un salon de destination.', true);
        return;
      }

      fetch('/api/config/announce-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('✅ Embed du catalogue des commandes envoyé !');
        } else {
          showToast(`❌ Erreur : ${data.error}`, true);
        }
      })
      .catch(err => showToast(`❌ Erreur réseau : ${err.message}`, true));
    });
  }

  // Initialiser l'envoyeur d'embeds simple
  initSimpleEmbedSender();
});

// --- ENVOYEUR D'EMBEDS SIMPLE ---
function initSimpleEmbedSender() {
  const form = document.getElementById('form-simple-embed');
  if (!form) return;

  const inputTitle = document.getElementById('simple_embed_title');
  const inputDesc = document.getElementById('simple_embed_desc');
  const inputColor = document.getElementById('simple_embed_color');
  const selectThumb = document.getElementById('simple_embed_thumbnail_option');
  const customThumbGroup = document.getElementById('group_simple_embed_custom_thumb');
  const inputCustomThumb = document.getElementById('simple_embed_custom_thumb_url');
  const fileCustomThumb = document.getElementById('simple_embed_custom_thumb_file');
  const inputImage = document.getElementById('simple_embed_image');
  const fileImage = document.getElementById('simple_embed_image_file');
  const inputAuthorName = document.getElementById('simple_embed_author_name');
  const inputAuthorIcon = document.getElementById('simple_embed_author_icon');
  const fileAuthorIcon = document.getElementById('simple_embed_author_icon_file');
  const inputFooterText = document.getElementById('simple_embed_footer_text');
  const selectPing = document.getElementById('simple_embed_ping');

  // Helper Téléverser un fichier
  const handleFileUpload = async (fileInput, textInput) => {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('📤 Téléversement de l\'image en cours...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        textInput.value = data.url;
        showToast('✅ Image téléversée avec succès !');
        updatePreview();
      } else {
        showToast(`❌ Erreur téléversement : ${data.error || 'Erreur inconnue'}`, true);
      }
    } catch (err) {
      showToast(`❌ Erreur réseau : ${err.message}`, true);
    }
  };

  if (fileImage) fileImage.addEventListener('change', () => handleFileUpload(fileImage, inputImage));
  if (fileCustomThumb) fileCustomThumb.addEventListener('change', () => handleFileUpload(fileCustomThumb, inputCustomThumb));
  if (fileAuthorIcon) fileAuthorIcon.addEventListener('change', () => handleFileUpload(fileAuthorIcon, inputAuthorIcon));

  document.addEventListener('change', async (e) => {
    if (e.target && (e.target.classList.contains('file-upload-input') || e.target.type === 'file')) {
      const targetId = e.target.getAttribute('data-target');
      if (targetId) {
        const targetInput = document.getElementById(targetId);
        if (targetInput && e.target.files && e.target.files.length > 0) {
          await handleFileUpload(e.target, targetInput);
        }
      }
    }
  });

  const btnUseMyProfile = document.getElementById('btn_simple_embed_use_my_profile');
  if (btnUseMyProfile) {
    btnUseMyProfile.addEventListener('click', async () => {
      let userObj = currentUser;
      if (!userObj) {
        try {
          const res = await fetch('/api/user');
          const data = await res.json();
          if (data && data.user) {
            userObj = data.user;
            currentUser = data.user;
          }
        } catch (e) {}
      }

      const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);

      let name = null;
      let avatar = null;

      if (userObj && userObj.id && userObj.id !== '0') {
        name = userObj.global_name || userObj.username;
        avatar = userObj.avatar_url;
        if (!avatar && userObj.avatar) {
          avatar = `https://cdn.discordapp.com/avatars/${userObj.id}/${userObj.avatar}.png?size=256`;
        }

        if (guildId) {
          try {
            const mRes = await fetch(`/api/members?guildId=${guildId}`);
            const members = await mRes.json();
            if (Array.isArray(members)) {
              const myMember = members.find(m => m.id === userObj.id);
              if (myMember && myMember.displayName) {
                name = myMember.displayName;
              }
            }
          } catch (e) {}
        }
      }

      if (!name || !avatar || avatar.includes('embed/avatars')) {
        if (typeof currentBotName !== 'undefined' && currentBotName) name = currentBotName;
        if (typeof currentBotAvatar !== 'undefined' && currentBotAvatar) avatar = currentBotAvatar;
      }

      if (!name) name = 'Administrateur';
      if (!avatar) avatar = 'https://cdn.discordapp.com/embed/avatars/0.png';

      const inputAuthorName = document.getElementById('simple_embed_author_name') || document.getElementById('simple-embed-preview-author-name');
      const inputAuthorIcon = document.getElementById('simple_embed_author_icon');

      if (inputAuthorName) {
        if (inputAuthorName.tagName === 'INPUT') {
          inputAuthorName.value = name;
          inputAuthorName.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
          inputAuthorName.value = name;
        }
      }
      if (inputAuthorIcon) {
        inputAuthorIcon.value = avatar;
        if (inputAuthorIcon.tagName === 'INPUT') {
          inputAuthorIcon.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      if (typeof showToast === 'function') showToast(`👤 Nom (${name}) et photo de profil insérés !`);
      updatePreview();
    });
  }

  const btnClearAuthor = document.getElementById('btn_simple_embed_clear_author');
  if (btnClearAuthor) {
    btnClearAuthor.addEventListener('click', () => {
      const inputAuthorName = document.getElementById('simple_embed_author_name') || document.getElementById('simple-embed-preview-author-name');
      const inputAuthorIcon = document.getElementById('simple_embed_author_icon');
      if (inputAuthorName) {
        inputAuthorName.value = '';
        if (inputAuthorName.tagName === 'INPUT') inputAuthorName.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (inputAuthorIcon) {
        inputAuthorIcon.value = '';
        if (inputAuthorIcon.tagName === 'INPUT') inputAuthorIcon.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (typeof showToast === 'function') showToast('🗑️ Section Auteur vidée.');
      updatePreview();
    });
  }

  // Elements preview
  const prevTitle = document.getElementById('simple-embed-preview-title');
  const prevDesc = document.getElementById('simple-embed-preview-desc');
  const prevContainer = document.getElementById('simple-embed-preview-container');
  const prevThumb = document.getElementById('simple-embed-preview-thumbnail');
  const thumbPlaceholder = document.getElementById('simple-embed-thumbnail-placeholder');
  const prevImage = document.getElementById('simple-embed-preview-image');
  const prevAuthor = document.getElementById('simple-embed-preview-author');
  const prevAuthorIcon = document.getElementById('simple-embed-preview-author-icon');
  const prevAuthorName = document.getElementById('simple-embed-preview-author-name');
  const prevFooter = document.getElementById('simple-embed-preview-footer');
  const prevFooterText = document.getElementById('simple-embed-preview-footer-text');
  const prevMention = document.getElementById('simple-embed-preview-mention');

  function updatePreview() {
    const inputTitle = document.getElementById('simple_embed_title') || document.getElementById('simple-embed-preview-title');
    const inputDesc = document.getElementById('simple_embed_desc') || document.getElementById('simple-embed-preview-desc');
    const inputColor = document.getElementById('simple_embed_color');
    const selectThumb = document.getElementById('simple_embed_thumbnail_option');
    const customThumbGroup = document.getElementById('group_simple_embed_custom_thumb');
    const inputCustomThumb = document.getElementById('simple_embed_custom_thumb_url');
    const inputImage = document.getElementById('simple_embed_image');
    const inputAuthorName = document.getElementById('simple_embed_author_name') || document.getElementById('simple-embed-preview-author-name');
    const inputAuthorIcon = document.getElementById('simple_embed_author_icon');
    const inputFooterText = document.getElementById('simple_embed_footer_text');
    const selectPing = document.getElementById('simple_embed_ping');

    const prevTitle = document.getElementById('simple-embed-preview-title');
    const prevDesc = document.getElementById('simple-embed-preview-desc');
    const prevContainer = document.getElementById('simple-embed-preview-container');
    const prevThumb = document.getElementById('simple-embed-preview-thumbnail');
    const thumbPlaceholder = document.getElementById('simple-embed-thumbnail-placeholder');
    const prevImage = document.getElementById('simple-embed-preview-image');
    const imageOverlay = document.querySelector('.discord-image-input-overlay');
    const prevAuthor = document.getElementById('simple-embed-preview-author');
    const prevAuthorIcon = document.getElementById('simple-embed-preview-author-icon');
    const prevAuthorName = document.getElementById('simple-embed-preview-author-name');
    const prevFooter = document.getElementById('simple-embed-preview-footer');
    const prevFooterText = document.getElementById('simple-embed-preview-footer-text');
    const prevMention = document.getElementById('simple-embed-preview-mention');

    // Title
    if (prevTitle) {
      const val = inputTitle ? (inputTitle.value || '') : '';
      if (prevTitle.tagName === 'INPUT') {
        if (inputTitle && prevTitle !== inputTitle) prevTitle.value = val;
      } else {
        prevTitle.innerText = val || 'Aperçu du Titre';
        prevTitle.style.display = 'block';
      }
    }

    // Description
    if (prevDesc) {
      const val = inputDesc ? (inputDesc.value || '') : '';
      if (prevDesc.tagName === 'TEXTAREA' || prevDesc.tagName === 'INPUT') {
        if (inputDesc && prevDesc !== inputDesc) prevDesc.value = val;
      } else {
        prevDesc.innerText = val || 'Aperçu de la description...';
      }
    }

    // Color
    if (inputColor && prevContainer) {
      prevContainer.style.borderLeftColor = inputColor.value || '#5865f2';
    }

    // Thumbnail (Miniature)
    const thumbVal = selectThumb ? selectThumb.value : (window.simpleEmbedThumbMode || 'none');
    let thumbSrc = null;

    if (thumbVal === 'custom') {
      if (customThumbGroup) customThumbGroup.style.display = 'block';
      if (inputCustomThumb && inputCustomThumb.value.trim()) {
        thumbSrc = inputCustomThumb.value.trim();
      }
    } else {
      if (customThumbGroup) customThumbGroup.style.display = 'none';
      if (thumbVal === 'user') {
        let userObj = currentUser;
        if (userObj) {
          thumbSrc = userObj.avatar_url || (userObj.avatar ? `https://cdn.discordapp.com/avatars/${userObj.id}/${userObj.avatar}.png?size=256` : null);
        }
      } else if (thumbVal === 'server') {
        const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
        const guild = (typeof guildsList !== 'undefined' && Array.isArray(guildsList)) ? guildsList.find(g => g.id === guildId) : null;
        if (guild) {
          thumbSrc = guild.iconURL || guild.icon_url || (guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256` : null);
        }
        if (!thumbSrc && typeof currentGuildIcon !== 'undefined' && currentGuildIcon) {
          thumbSrc = currentGuildIcon;
        }
      } else if (thumbVal === 'bot') {
        if (typeof currentBotAvatar !== 'undefined' && currentBotAvatar) {
          thumbSrc = currentBotAvatar;
        }
      }
    }

    if (thumbSrc && prevThumb) {
      prevThumb.src = thumbSrc;
      prevThumb.style.display = 'block';
      if (thumbPlaceholder) thumbPlaceholder.style.display = 'none';
    } else {
      if (prevThumb) prevThumb.style.display = 'none';
      if (thumbPlaceholder) thumbPlaceholder.style.display = 'flex';
    }

    // Image
    const imageVal = inputImage ? inputImage.value.trim() : '';
    if (imageVal && prevImage) {
      prevImage.src = imageVal;
      prevImage.style.display = 'block';
      if (imageOverlay) imageOverlay.style.display = 'none';
    } else {
      if (prevImage) prevImage.style.display = 'none';
      if (imageOverlay) imageOverlay.style.display = 'flex';
    }

    // Author (Optionnel - Se masque totalement si vide)
    const authorNameVal = inputAuthorName ? (inputAuthorName.value || '').trim() : '';
    const authorIconVal = inputAuthorIcon ? (inputAuthorIcon.value || '').trim() : '';

    if (authorNameVal || authorIconVal) {
      if (prevAuthorName) {
        if (prevAuthorName.tagName === 'INPUT') {
          prevAuthorName.value = authorNameVal;
        } else {
          prevAuthorName.innerText = authorNameVal || '';
          prevAuthorName.style.display = authorNameVal ? 'inline' : 'none';
        }
      }
      if (prevAuthorIcon) {
        if (authorIconVal) {
          prevAuthorIcon.src = authorIconVal;
          prevAuthorIcon.style.display = 'block';
          prevAuthorIcon.style.width = '24px';
          prevAuthorIcon.style.height = '24px';
          prevAuthorIcon.style.borderRadius = '50%';
          const uploadBtn = document.querySelector('.embed-avatar-upload-btn');
          if (uploadBtn) uploadBtn.style.display = 'none';
        } else {
          prevAuthorIcon.style.display = 'none';
          const uploadBtn = document.querySelector('.embed-avatar-upload-btn');
          if (uploadBtn) uploadBtn.style.display = 'flex';
        }
      }
      if (prevAuthor && prevAuthor.tagName !== 'INPUT') prevAuthor.style.display = 'flex';
    } else {
      if (prevAuthorName && prevAuthorName.tagName === 'INPUT') {
        prevAuthorName.value = '';
      }
      if (prevAuthorIcon) prevAuthorIcon.style.display = 'none';
      if (prevAuthor && prevAuthor.tagName !== 'INPUT') prevAuthor.style.display = 'none';
    }

    // Footer
    const footerVal = inputFooterText ? (inputFooterText.value || '').trim() : '';
    if (footerVal && prevFooter) {
      if (prevFooterText) prevFooterText.innerText = footerVal;
      prevFooter.style.display = 'flex';
    } else if (prevFooter) {
      prevFooter.style.display = 'none';
    }

    // Ping
    if (selectPing && prevMention) {
      if (selectPing.value === 'everyone') {
        prevMention.innerText = '@everyone';
        prevMention.style.display = 'block';
      } else if (selectPing.value === 'here') {
        prevMention.innerText = '@here';
        prevMention.style.display = 'block';
      } else {
        prevMention.style.display = 'none';
      }
    }
  }

  // --- Dashboard 2 Interactive Popovers & Click Handlers ---
  const thumbBox = document.getElementById('simple-embed-thumbnail-box');
  const thumbPopover = document.getElementById('simple-embed-thumbnail-popover');
  if (thumbBox && thumbPopover) {
    thumbBox.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = thumbPopover.style.display;
      thumbPopover.style.display = (current === 'none' || !current) ? 'block' : 'none';
    });
  }

  document.querySelectorAll('.thumbnail-option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = btn.dataset.thumbMode;
      window.simpleEmbedThumbMode = mode;

      const selectThumb = document.getElementById('simple_embed_thumbnail_option');
      if (selectThumb) selectThumb.value = mode;

      const customRow = document.getElementById('group_simple_embed_custom_thumb');
      if (mode === 'custom') {
        if (customRow) customRow.style.display = 'flex';
      } else {
        if (customRow) customRow.style.display = 'none';
        if (thumbPopover) thumbPopover.style.display = 'none';
      }
      updatePreview();
    });
  });

  const imageBox = document.getElementById('simple-embed-image-box');
  const imageUrlWrap = document.getElementById('simple-embed-image-url-wrap');
  if (imageBox && imageUrlWrap) {
    imageBox.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('.btn-upload-label')) return;
      e.stopPropagation();
      const current = imageUrlWrap.style.display;
      imageUrlWrap.style.display = (current === 'none' || !current) ? 'block' : 'none';
      const inputImg = document.getElementById('simple_embed_image');
      if (inputImg && imageUrlWrap.style.display === 'block') inputImg.focus();
    });
  }

  const authorAvatarWrap = document.getElementById('simple-embed-author-avatar-wrap');
  const authorIconUrlWrap = document.getElementById('simple-embed-author-icon-url-wrap');
  if (authorAvatarWrap && authorIconUrlWrap) {
    authorAvatarWrap.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.closest('.embed-avatar-upload-btn')) return;
      e.stopPropagation();
      const current = authorIconUrlWrap.style.display;
      authorIconUrlWrap.style.display = (current === 'none' || !current) ? 'block' : 'none';
      const inputAuthIcon = document.getElementById('simple_embed_author_icon');
      if (inputAuthIcon && authorIconUrlWrap.style.display === 'block') inputAuthIcon.focus();
    });
  }

  document.addEventListener('click', (e) => {
    if (thumbPopover && !e.target.closest('#simple-embed-thumbnail-wrap')) {
      thumbPopover.style.display = 'none';
    }
    if (imageUrlWrap && !e.target.closest('#simple-embed-image-box')) {
      imageUrlWrap.style.display = 'none';
    }
    if (authorIconUrlWrap && !e.target.closest('#simple-embed-author-avatar-wrap')) {
      authorIconUrlWrap.style.display = 'none';
    }
  });


  let channelEmbedsList = [];
  const simpleEmbedChanSelect = document.getElementById('simple_embed_channel');
  const selectChannelEmbedsGroup = document.getElementById('group_select_channel_embeds');

  function renderChannelEmbedCards(embeds) {
    const listEl = document.getElementById('channel_embeds_cards_list');
    if (!listEl || !selectChannelEmbedsGroup) return;

    listEl.innerHTML = '';
    if (!Array.isArray(embeds) || embeds.length === 0) {
      selectChannelEmbedsGroup.style.display = 'none';
      return;
    }

    selectChannelEmbedsGroup.style.display = 'block';

    embeds.forEach(emb => {
      const card = document.createElement('div');
      card.className = 'embed-card-item';
      card.style.cssText = 'background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); padding: 12px 16px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px; transition: all 0.2s ease;';

      const titleText = emb.title ? emb.title.trim() : 'Embed sans titre';
      const descText = emb.description ? emb.description.trim().replace(/\n/g, ' ') : 'Aucune description';

      card.innerHTML = `
        <div style="flex-grow: 1; min-width: 0;">
          <div style="font-weight: 700; color: #ffffff; font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
            <i class="fa-solid fa-file-lines" style="color: #5865f2;"></i> ${titleText}
          </div>
          <div style="color: #b9bbbe; font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 3px;">
            ${descText.length > 70 ? descText.slice(0, 70) + '...' : descText}
          </div>
          <div style="color: #8e9297; font-size: 0.75rem; margin-top: 4px;">
            ID: <code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; color: #5865f2;">${emb.id}</code>
          </div>
        </div>
        <div style="display: flex; gap: 8px; flex-shrink: 0;">
          <button type="button" class="btn btn-edit-embed-card" data-id="${emb.id}" style="background: #5865F2; color: #ffffff; border: none; padding: 7px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Charger cet embed dans l'éditeur">
            <i class="fa-solid fa-pen-to-square"></i> Modifier
          </button>
          <button type="button" class="btn btn-delete-embed-card" data-id="${emb.id}" style="background: #e74c3c; color: #ffffff; border: none; padding: 7px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" title="Supprimer définitivement ce message du salon Discord">
            <i class="fa-solid fa-trash-can"></i> Supprimer
          </button>
        </div>
      `;

      const btnEdit = card.querySelector('.btn-edit-embed-card');
      if (btnEdit) {
        btnEdit.addEventListener('click', () => {
          safeSetVal('simple_embed_edit_msg_id', emb.id);
          safeSetVal('simple_embed_title', emb.title || '');
          safeSetVal('simple_embed_desc', emb.description || '');
          safeSetVal('simple_embed_color', emb.color || '#5865F2');
          safeSetVal('simple_embed_image', emb.image || '');
          safeSetVal('simple_embed_author_name', emb.author_name || '');
          safeSetVal('simple_embed_author_icon', emb.author_icon || '');
          safeSetVal('simple_embed_footer_text', emb.footer || '');
          showToast(`✏️ Message [${emb.id}] chargé dans l'éditeur !`);
          updatePreview();
        });
      }

      const btnDelete = card.querySelector('.btn-delete-embed-card');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          const channel_id = simpleEmbedChanSelect ? simpleEmbedChanSelect.value : null;
          const message_id = emb.id;

          if (!channel_id || !message_id) return;

          if (!confirm(`Voulez-vous vraiment supprimer définitivement ce message embed (${emb.title || emb.id}) du salon Discord ?`)) {
            return;
          }

          try {
            const res = await fetch('/api/config/embeds/delete-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ channel_id, message_id })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              showToast(data.message || '✅ Message Embed supprimé avec succès !');
              safeSetVal('simple_embed_edit_msg_id', '');
              if (form) form.reset();
              updatePreview();
              if (simpleEmbedChanSelect) simpleEmbedChanSelect.dispatchEvent(new Event('change'));
            } else {
              showToast(`❌ Erreur : ${data.error || 'Impossible de supprimer l\'embed'}`, true);
            }
          } catch (err) {
            showToast(`❌ Erreur réseau : ${err.message}`, true);
          }
        });
      }

      listEl.appendChild(card);
    });
  }

  if (simpleEmbedChanSelect) {
    simpleEmbedChanSelect.addEventListener('change', () => {
      const channelId = simpleEmbedChanSelect.value;
      if (!channelId) {
        if (selectChannelEmbedsGroup) selectChannelEmbedsGroup.style.display = 'none';
        return;
      }

      fetch(`/api/config/embeds/fetch-channel-messages?channelId=${channelId}`)
        .then(res => res.json())
        .then(embeds => {
          channelEmbedsList = Array.isArray(embeds) ? embeds : [];
          renderChannelEmbedCards(channelEmbedsList);
        })
        .catch(console.error);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const channel_id = document.getElementById('simple_embed_channel')?.value;
    if (!channel_id) return showToast('⚠️ Veuillez sélectionner un salon de destination.', true);

    const getVal = (id1, id2) => {
      const el1 = document.getElementById(id1);
      if (el1 && el1.value !== undefined && el1.value.trim() !== '') return el1.value.trim();
      const el2 = document.getElementById(id2);
      if (el2 && el2.value !== undefined) return el2.value.trim();
      return '';
    };

    const title = getVal('simple_embed_title', 'simple-embed-preview-title');
    const description = getVal('simple_embed_desc', 'simple-embed-preview-desc');
    const color = document.getElementById('simple_embed_color')?.value || '#5865f2';
    const image_url = getVal('simple_embed_image', 'simple_embed_image');
    const author_name = getVal('simple_embed_author_name', 'simple-embed-preview-author-name');
    const author_icon = getVal('simple_embed_author_icon', 'simple_embed_author_icon');
    const footer_text = getVal('simple_embed_footer_text', 'simple-embed-preview-footer-text');
    const editMsgId = document.getElementById('simple_embed_edit_msg_id')?.value || '';

    let thumbnail_url = selectThumb ? selectThumb.value : (window.simpleEmbedThumbMode || 'none');
    if (thumbnail_url === 'custom' && inputCustomThumb && inputCustomThumb.value.trim()) {
      thumbnail_url = inputCustomThumb.value.trim();
    }

    const payload = {
      channel_id,
      title,
      description,
      color,
      thumbnail_url,
      image_url,
      author_name,
      author_icon,
      footer_text,
      ping_type: selectPing ? selectPing.value : 'none',
      existing_message_id: editMsgId
    };

    try {
      const res = await fetch('/api/config/send-simple-embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || '✅ Message Embed envoyé avec succès !');
        form.reset();
        updatePreview();
      } else {
        showToast(`❌ Erreur : ${data.error || 'Impossible d\'envoyer l\'embed'}`, true);
      }
    } catch (err) {
      showToast(`❌ Erreur réseau : ${err.message}`, true);
    }
  });
}

// --- SYSTÈME DE SONDAGE ET ÉVALUATIONS PAR FORMULAIRE MULTI-SECTIONS ---
function addSondageQuestionInput(labelVal = '', typeVal = 'rating_text', optionsVal = []) {
  const container = document.getElementById('sondage-questions-container');
  if (!container) return;
  const qIndex = container.children.length + 1;
  const div = document.createElement('div');
  div.className = 'sondage-question-row';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.gap = '6px';
  div.style.background = 'rgba(255,255,255,0.03)';
  div.style.padding = '8px 10px';
  div.style.borderRadius = '6px';
  div.style.border = '1px solid rgba(255,255,255,0.08)';

  const optionsStr = Array.isArray(optionsVal) ? optionsVal.join(', ') : (optionsVal || '');

  div.innerHTML = `
    <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
      <input type="text" class="inner-input sondage-q-label" placeholder="ex: ${qIndex}. Intitulé de la question..." value="${labelVal}" style="flex: 1;">
      <select class="custom-select sondage-q-type" style="width: 200px;">
        <option value="rating_text" ${typeVal === 'rating_text' ? 'selected' : ''}>⭐ Étoiles (1-5) + Remarque</option>
        <option value="rating" ${typeVal === 'rating' ? 'selected' : ''}>⭐ Étoiles seules (1-5)</option>
        <option value="radio" ${typeVal === 'radio' ? 'selected' : ''}>🔘 Choix Unique (Radio)</option>
        <option value="checkbox" ${typeVal === 'checkbox' ? 'selected' : ''}>☑️ Choix Multiples (Checkboxes)</option>
        <option value="scale" ${typeVal === 'scale' ? 'selected' : ''}>📊 Échelle de 1 à 10</option>
        <option value="text" ${typeVal === 'text' ? 'selected' : ''}>💬 Texte Libre (Réponse écrite)</option>
      </select>
      <button type="button" class="btn-remove-q" style="padding: 6px 10px; border: none; background: rgba(231,76,60,0.2); color: #e74c3c; border-radius: 4px; cursor: pointer;" title="Supprimer la question"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div class="sondage-q-options-row" style="display: ${['radio', 'checkbox'].includes(typeVal) ? 'block' : 'none'}; margin-top: 2px;">
      <input type="text" class="inner-input sondage-q-options" placeholder="Entrez les choix séparés par des virgules (ex: Oui, Non, Peut-être)" value="${optionsStr}" style="width: 100%; font-size: 0.82rem;">
    </div>
  `;

  const typeSel = div.querySelector('.sondage-q-type');
  const optsRow = div.querySelector('.sondage-q-options-row');

  typeSel.addEventListener('change', () => {
    if (['radio', 'checkbox'].includes(typeSel.value)) {
      optsRow.style.display = 'block';
    } else {
      optsRow.style.display = 'none';
    }
    updateSondagePreview();
  });

  div.querySelector('.btn-remove-q').addEventListener('click', () => {
    div.remove();
    updateSondagePreview();
  });
  div.querySelector('.sondage-q-label').addEventListener('input', updateSondagePreview);

  container.appendChild(div);
  updateSondagePreview();
}

function updateSondagePreview() {
  const inputTitle = document.getElementById('sondage_title');
  const inputDesc = document.getElementById('sondage_desc');
  const selectIcon = document.getElementById('sondage_icon');
  const customIconInput = document.getElementById('sondage_icon_custom');
  const selectTextType = document.getElementById('sondage_text_type');
  const inputColor = document.getElementById('sondage_color');

  const previewBorder = document.getElementById('sondage-preview-border');
  const previewTitle = document.getElementById('sondage-preview-title');
  const previewDesc = document.getElementById('sondage-preview-desc');
  const modalTitle = document.getElementById('sondage-modal-preview-title');
  const modalTextType = document.getElementById('sondage-modal-text-type');

  if (previewBorder && inputColor) previewBorder.style.borderLeftColor = inputColor.value || '#78A8C6';
  if (previewTitle && inputTitle) previewTitle.textContent = inputTitle.value.trim() ? `📊 ${inputTitle.value.trim()}` : "📊 Avis sur l'Événement du Serveur";
  if (previewDesc && inputDesc) previewDesc.textContent = inputDesc.value.trim() ? inputDesc.value.trim() : "Consignes affichées dans l'embed au-dessus du bouton...";
  if (modalTitle && inputTitle) modalTitle.textContent = `Modal : ${inputTitle.value.trim() || "Avis sur l'Événement du Serveur"}`;
  
  if (modalTextType && selectTextType) {
    modalTextType.textContent = selectTextType.value === 'court' ? 'Ligne unique' : 'Paragraphe Multiligne';
  }

  let iconVal = '⭐';
  if (selectIcon) {
    if (selectIcon.value === 'custom') {
      if (customIconInput) customIconInput.style.display = 'block';
      iconVal = (customIconInput && customIconInput.value.trim()) ? customIconInput.value.trim() : '⭐';
    } else {
      if (customIconInput) customIconInput.style.display = 'none';
      iconVal = selectIcon.value;
    }
  }

  document.querySelectorAll('.sondage-preview-icon-item').forEach(el => {
    el.textContent = iconVal;
  });
}

function renderSondagesSavedList(sondages) {
  const container = document.getElementById('sondages-saved-list');
  if (!container) return;
  container.innerHTML = '';

  if (!sondages || sondages.length === 0) {
    container.innerHTML = '<p style="color: #8e9297; font-style: italic; font-size: 0.85rem;">Aucun sondage enregistré pour le moment. Publiez-en un avec le formulaire ci-dessous !</p>';
    return;
  }

  sondages.forEach(s => {
    const channelName = typeof getChannelName === 'function' ? getChannelName(s.channel_id) : s.channel_id;
    const card = document.createElement('div');
    card.style.background = 'rgba(255,255,255,0.03)';
    card.style.border = '1px solid rgba(255,255,255,0.08)';
    card.style.padding = '10px 14px';
    card.style.borderRadius = '8px';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.gap = '10px';

    card.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: #fff; font-size: 0.95rem;">📊 ${s.title}</div>
        <div style="font-size: 0.8rem; color: #b9bbbe;">
          Salon: <strong>#${channelName}</strong> · Note : <strong>${s.avg_rating || 0}/5 ${s.rating_icon || '⭐'}</strong> (${s.total_votes || 0} votes)
        </div>
      </div>
      <div style="display: flex; gap: 6px;">
        <button type="button" class="btn btn-sm btn-edit-sondage" style="background: #3498db; color: #fff; border: none; padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; cursor: pointer;">
          <i class="fa-solid fa-pen-to-square"></i> Modifier
        </button>
        <button type="button" class="btn btn-sm btn-delete-sondage" style="background: #e74c3c; color: #fff; border: none; padding: 6px 12px; font-size: 0.82rem; border-radius: 6px; cursor: pointer;">
          <i class="fa-solid fa-trash"></i> Supprimer
        </button>
      </div>
    `;

    card.querySelector('.btn-edit-sondage').addEventListener('click', () => {
      safeSetVal('sondage_edit_id', s.id);
      const editBanner = document.getElementById('sondage-edit-banner');
      if (editBanner) editBanner.style.display = 'flex';

      safeSetVal('sondage_channel', s.channel_id);
      safeSetVal('sondage_results_channel', s.results_channel_id || '');
      safeSetVal('sondage_title', s.title || '');
      safeSetVal('sondage_desc', s.description || '');

      const iconSel = document.getElementById('sondage_icon');
      const customIconInput = document.getElementById('sondage_icon_custom');
      if (iconSel) {
        const standardIcons = ['⭐', '❤️', '👍', '🔥', '🎯', '💎', '👑', '🌟', '🏆', '📌', '✨'];
        if (standardIcons.includes(s.rating_icon)) {
          iconSel.value = s.rating_icon;
          if (customIconInput) customIconInput.style.display = 'none';
        } else {
          iconSel.value = 'custom';
          if (customIconInput) {
            customIconInput.style.display = 'block';
            customIconInput.value = s.rating_icon || '';
          }
        }
      }

      safeSetVal('sondage_text_type', s.text_type || 'long');
      safeSetVal('sondage_color', s.color || '#F1C40F');
      safeSetVal('sondage_short_desc', s.short_description || '');
      safeSetVal('sondage_avatar_image', s.avatar_image || '');
      safeSetVal('sondage_banner_image', s.banner_image || '');

      let mentionsStr = '';
      try {
        const mArr = typeof s.mentions === 'string' ? JSON.parse(s.mentions || '[]') : (s.mentions || []);
        mentionsStr = Array.isArray(mArr) ? mArr.join(' ') : '';
      } catch (e) {}
      safeSetVal('sondage_mentions', mentionsStr);

      const hasGenCheck = document.getElementById('sondage_has_general_remark');
      if (hasGenCheck) hasGenCheck.checked = s.has_general_remark !== 0;

      const qContainer = document.getElementById('sondage-questions-container');
      if (qContainer) {
        qContainer.innerHTML = '';
        let secArr = [];
        try {
          secArr = typeof s.sections === 'string' ? JSON.parse(s.sections || '[]') : (s.sections || []);
        } catch (e) {}

        if (Array.isArray(secArr) && secArr.length > 0) {
          secArr.forEach(sec => {
            addSondageQuestionInput(sec.label || '', sec.type || 'rating_text', sec.options || []);
          });
        } else {
          addSondageQuestionInput('Accueil & Organisation', 'rating_text');
        }
      }

      safeSetVal('sondage_google_url', s.google_form_url || '');
      updateGoogleAppsScriptCode(s.id);

      updateSondagePreview();
      if (typeof showToast === 'function') showToast(`Formulaire "${s.title}" chargé pour modification dans l'éditeur ci-dessous.`);
      
      const formEl = document.getElementById('form-sondage');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth' });
    });

    card.querySelector('.btn-delete-sondage').addEventListener('click', async () => {
      if (!confirm('Supprimer ce sondage de la base de données ?')) return;
      try {
        const res = await fetch('/api/config/delete-sondage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sondage_id: s.id })
        });
        const data = await res.json();
        if (data.success) {
          if (typeof showToast === 'function') showToast('Sondage supprimé !');
          loadSondagesSavedList();
        } else {
          if (typeof showToast === 'function') showToast(`Erreur : ${data.error}`, true);
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast(`Erreur : ${err.message}`, true);
      }
    });

    container.appendChild(card);
  });
}

function updateGoogleAppsScriptCode(sondageId) {
  const codeBox = document.getElementById('apps-script-code');
  if (!codeBox) return;
  const sId = sondageId || 'VOTRE_ID_SONDAGE';
  const scriptCode = `function onFormSubmit(e) {
  var response = e.response;
  var itemResponses = response.getItemResponses();
  var answers = [];
  for (var i = 0; i < itemResponses.length; i++) {
    answers.push({
      question: itemResponses[i].getItem().getTitle(),
      answer: itemResponses[i].getResponse()
    });
  }
  var payload = {
    sondageId: '${sId}',
    userEmail: response.getRespondentEmail() || '',
    answers: answers
  };
  UrlFetchApp.fetch('http://82.65.75.176:49602/api/google-forms/webhook?sondage_id=${sId}', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  });
}`;
  codeBox.value = scriptCode;
}

async function loadSondagesSavedList() {
  try {
    const res = await fetch('/api/config/sondages');
    const sondages = await res.json();
    renderSondagesSavedList(sondages);
  } catch (e) {
    console.error('Erreur chargement sondages:', e);
  }
}

function initSondageModule() {
  const form = document.getElementById('form-sondage');
  const inputTitle = document.getElementById('sondage_title');
  const inputDesc = document.getElementById('sondage_desc');
  const selectIcon = document.getElementById('sondage_icon');
  const customIconInput = document.getElementById('sondage_icon_custom');
  const selectTextType = document.getElementById('sondage_text_type');
  const inputColor = document.getElementById('sondage_color');
  const hasGeneralRemark = document.getElementById('sondage_has_general_remark');
  const btnAddQ = document.getElementById('btn-add-sondage-question');
  const qContainer = document.getElementById('sondage-questions-container');

  const btnCopyScript = document.getElementById('btn-copy-apps-script');
  if (btnCopyScript) {
    btnCopyScript.addEventListener('click', () => {
      const codeBox = document.getElementById('apps-script-code');
      if (codeBox && codeBox.value) {
        navigator.clipboard.writeText(codeBox.value);
        if (typeof showToast === 'function') showToast('📋 Script Google Apps Script copié dans le presse-papier !');
      }
    });
  }

  updateGoogleAppsScriptCode(document.getElementById('sondage_edit_id') ? document.getElementById('sondage_edit_id').value : '');

  if (qContainer && qContainer.children.length === 0) {
    addSondageQuestionInput('Accueil & Organisation', 'rating_text');
    addSondageQuestionInput('Ambiance & Animations', 'rating_text');
  }

  if (btnAddQ) {
    btnAddQ.addEventListener('click', () => addSondageQuestionInput('', 'rating_text'));
  }

  const btnCancelEdit = document.getElementById('btn-cancel-sondage-edit');
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => {
      safeSetVal('sondage_edit_id', '');
      const editBanner = document.getElementById('sondage-edit-banner');
      if (editBanner) editBanner.style.display = 'none';
      if (form) form.reset();
      updateGoogleAppsScriptCode('');
      updateSondagePreview();
      if (typeof showToast === 'function') showToast('Modification annulée.');
    });
  }

  if (inputTitle) inputTitle.addEventListener('input', updateSondagePreview);
  if (inputDesc) inputDesc.addEventListener('input', updateSondagePreview);
  if (selectIcon) selectIcon.addEventListener('change', updateSondagePreview);
  if (customIconInput) customIconInput.addEventListener('input', updateSondagePreview);
  if (selectTextType) selectTextType.addEventListener('change', updateSondagePreview);
  if (inputColor) inputColor.addEventListener('input', updateSondagePreview);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const existing_sondage_id = document.getElementById('sondage_edit_id') ? document.getElementById('sondage_edit_id').value : null;
      const channel_id = document.getElementById('sondage_channel').value;
      const results_channel_id = document.getElementById('sondage_results_channel').value;
      const title = inputTitle.value;
      const description = inputDesc.value;
      const google_form_url = document.getElementById('sondage_google_url') ? document.getElementById('sondage_google_url').value.trim() : '';

      let rating_icon = '⭐';
      if (selectIcon) {
        rating_icon = selectIcon.value === 'custom' ? (customIconInput ? customIconInput.value.trim() || '⭐' : '⭐') : selectIcon.value;
      }

      const text_type = selectTextType ? selectTextType.value : 'long';
      const color = inputColor ? inputColor.value : '#78A8C6';
      const short_description = document.getElementById('sondage_short_desc') ? document.getElementById('sondage_short_desc').value : '';
      const avatar_image = document.getElementById('sondage_avatar_image') ? document.getElementById('sondage_avatar_image').value.trim() : '';
      const banner_image = document.getElementById('sondage_banner_image') ? document.getElementById('sondage_banner_image').value.trim() : '';
      const mentionsInput = document.getElementById('sondage_mentions') ? document.getElementById('sondage_mentions').value.trim() : '';

      const mentions = mentionsInput ? mentionsInput.split(/\s+/).filter(Boolean) : [];

      const qRows = document.querySelectorAll('.sondage-question-row');
      const sections = [];
      qRows.forEach((row, idx) => {
        const lbl = row.querySelector('.sondage-q-label').value.trim();
        const typ = row.querySelector('.sondage-q-type').value;
        const optsInput = row.querySelector('.sondage-q-options');
        const optsRaw = optsInput ? optsInput.value.trim() : '';
        const options = optsRaw ? optsRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        if (lbl) {
          sections.push({ id: `sec_${idx + 1}`, label: lbl, type: typ, options: options });
        }
      });

      if (sections.length === 0) {
        sections.push({ id: 'sec_1', label: title || 'Évaluation', type: 'rating_text' });
      }

      if (!channel_id) return showToast('⚠️ Veuillez choisir un salon de destination.', true);
      if (!title.trim()) return showToast('⚠️ Le titre du sondage est requis.', true);

      try {
        const res = await fetch('/api/config/send-sondage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            existing_sondage_id,
            channel_id,
            results_channel_id: results_channel_id || null,
            title,
            description,
            rating_icon,
            text_type,
            color,
            sections,
            has_general_remark: hasGeneralRemark ? hasGeneralRemark.checked : true,
            avatar_image,
            banner_image,
            short_description,
            mentions,
            google_form_url
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          if (typeof showToast === 'function') showToast(existing_sondage_id ? '✅ Sondage mis à jour avec succès !' : '✅ Sondage publié avec succès dans le salon !');
          form.reset();
          safeSetVal('sondage_edit_id', '');
          const editBanner = document.getElementById('sondage-edit-banner');
          if (editBanner) editBanner.style.display = 'none';
          if (qContainer) {
            qContainer.innerHTML = '';
            addSondageQuestionInput('Accueil & Organisation', 'rating_text');
            addSondageQuestionInput('Ambiance & Animations', 'rating_text');
          }
          updateSondagePreview();
          loadSondagesSavedList();
        } else {
          if (typeof showToast === 'function') showToast(`❌ Erreur : ${data.error}`, true);
        }
      } catch (err) {
        if (typeof showToast === 'function') showToast(`❌ Erreur réseau : ${err.message}`, true);
      }
    });
  }

  // --- SELECTION MESSAGE RÔLES RÉACTION ---
  const autoroleChanSelect = document.getElementById('autorole-embed-channel');
  const selectChannelAutorolesGroup = document.getElementById('group_select_channel_autoroles');
  const selectChannelAutoroles = document.getElementById('select_channel_autoroles');
  const existingMsgInput = document.getElementById('autorole-embed-existing-msg');
  let fetchedChannelMessagesList = [];

  const loadMessageDetailsIntoForm = (item) => {
    if (!item) return;
    if (existingMsgInput) existingMsgInput.value = item.id;
    const titleEl = document.getElementById('autorole-embed-title');
    if (titleEl) titleEl.value = item.title || '';
    const descEl = document.getElementById('autorole-embed-desc');
    if (descEl) descEl.value = item.description || '';
    const colorEl = document.getElementById('autorole-embed-color');
    if (colorEl) colorEl.value = item.color || '#5865F2';
    const thumbEl = document.getElementById('autorole-embed-thumbnail');
    if (thumbEl) thumbEl.value = item.thumbnail ? '1' : '0';
    const imgEl = document.getElementById('autorole-embed-image');
    if (imgEl) imgEl.value = item.image_url || '';
    const typeEl = document.getElementById('autorole-embed-type');
    if (typeEl) typeEl.value = item.type || 'buttons';

    if (Array.isArray(item.options)) {
      autoroleButtonsList = item.options.map(opt => ({
        role_id: opt.role_id,
        label: opt.label || '',
        emoji: opt.emoji || '',
        style: opt.style || 'PRIMARY'
      }));
    }

    if (typeof renderButtonsCreatorPreview === 'function') renderButtonsCreatorPreview();
    if (typeof updateAutorolePreview === 'function') updateAutorolePreview();
    showToast('Message existant et ses rôles/boutons chargés dans le formulaire !');
  };

  if (autoroleChanSelect) {
    autoroleChanSelect.addEventListener('change', () => {
      const channelId = autoroleChanSelect.value;
      if (!channelId) {
        if (selectChannelAutorolesGroup) selectChannelAutorolesGroup.style.display = 'none';
        if (selectChannelAutoroles) selectChannelAutoroles.innerHTML = '<option value="">-- Sélectionner un message --</option>';
        fetchedChannelMessagesList = [];
        return;
      }

      fetch(`/api/config/embeds/fetch-channel-messages?channelId=${channelId}`)
        .then(res => res.json())
        .then(data => {
          fetchedChannelMessagesList = Array.isArray(data) ? data : [];
          if (selectChannelAutoroles) {
            selectChannelAutoroles.innerHTML = '<option value="">-- Sélectionner un message à charger / modifier / copier --</option>';
            if (fetchedChannelMessagesList.length > 0) {
              fetchedChannelMessagesList.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                const textPreview = m.title || (m.description ? m.description.slice(0, 40) : `Message ${m.id}`);
                opt.textContent = `${m.author} : ${textPreview} (${m.id})`;
                selectChannelAutoroles.appendChild(opt);
              });
              if (selectChannelAutorolesGroup) selectChannelAutorolesGroup.style.display = 'block';
            } else {
              if (selectChannelAutorolesGroup) selectChannelAutorolesGroup.style.display = 'none';
            }
          }
        })
        .catch(console.error);
    });
  }

  if (selectChannelAutoroles) {
    selectChannelAutoroles.addEventListener('change', () => {
      const msgId = selectChannelAutoroles.value;
      if (!msgId) return;

      const item = fetchedChannelMessagesList.find(m => m.id === msgId);
      if (item) {
        loadMessageDetailsIntoForm(item);
      } else {
        fetch(`/api/config/embeds/fetch-message-details?messageId=${msgId}`)
          .then(res => res.json())
          .then(det => {
            if (det && det.id) loadMessageDetailsIntoForm(det);
          })
          .catch(console.error);
      }
    });
  }

  if (existingMsgInput) {
    let fetchTimeout = null;
    existingMsgInput.addEventListener('input', () => {
      const msgId = existingMsgInput.value.trim();
      if (!msgId || msgId.length < 15) return;
      clearTimeout(fetchTimeout);
      fetchTimeout = setTimeout(() => {
        const item = fetchedChannelMessagesList.find(m => m.id === msgId);
        if (item) {
          loadMessageDetailsIntoForm(item);
        } else {
          fetch(`/api/config/embeds/fetch-message-details?messageId=${msgId}`)
            .then(res => res.json())
            .then(det => {
              if (det && det.id) loadMessageDetailsIntoForm(det);
            })
            .catch(console.error);
        }
      }, 500);
    });
  }

  loadSondagesSavedList();
}

// --- ROLE BOOSTERS & INVITE TRACKER MODULES ---

function loadRoleBoosters() {
  fetch('/api/config/role-boosters')
    .then(r => r.json())
    .then(boosters => {
      const list = document.getElementById('role-boosters-list');
      if (!list) return;
      if (!Array.isArray(boosters) || boosters.length === 0) {
        list.innerHTML = '<tr><td colspan="5" class="text-center">Aucun rôle booster configuré.</td></tr>';
        return;
      }
      list.innerHTML = boosters.map(b => {
        const role = rolesList.find(r => r.id === b.role_id);
        const roleName = role ? role.name : (b.role_id || 'Rôle inconnu');
        return `
          <tr>
            <td><strong>@${roleName}</strong></td>
            <td><span class="nav-badge badge-gold" style="font-size: 0.85rem;">x${b.xp_multiplier}</span></td>
            <td><span class="nav-badge badge-purple" style="font-size: 0.85rem;">x${b.karma_multiplier}</span></td>
            <td><span class="nav-badge badge-green" style="font-size: 0.85rem;">x${b.money_multiplier}</span></td>
            <td class="text-center">
              <button type="button" class="btn btn-sm btn-logout" onclick="deleteRoleBooster('${b.role_id}')">
                <i class="fa-solid fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    })
    .catch(console.error);
}

window.deleteRoleBooster = function(roleId) {
  if (!confirm('Supprimer ce rôle booster ?')) return;
  fetch('/api/config/role-boosters/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role_id: roleId })
  })
  .then(r => r.json())
  .then(res => {
    if (res.success) {
      showToast('Rôle booster supprimé !');
      loadRoleBoosters();
    } else {
      showToast('Erreur: ' + res.error, true);
    }
  })
  .catch(err => showToast('Erreur: ' + err.message, true));
};

const formAddRoleBooster = document.getElementById('form-add-role-booster');
if (formAddRoleBooster) {
  formAddRoleBooster.addEventListener('submit', (e) => {
    e.preventDefault();
    const role_id = document.getElementById('booster_role').value;
    const xp_multiplier = parseFloat(document.getElementById('booster_xp').value) || 1.0;
    const karma_multiplier = parseFloat(document.getElementById('booster_karma').value) || 1.0;
    const money_multiplier = parseFloat(document.getElementById('booster_money').value) || 1.0;

    if (!role_id) return showToast('Sélectionnez un rôle', true);

    fetch('/api/config/role-boosters/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role_id, xp_multiplier, karma_multiplier, money_multiplier })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('Rôle booster enregistré !');
        formAddRoleBooster.reset();
        loadRoleBoosters();
      } else {
        showToast('Erreur: ' + res.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });
}

function loadInviteTracker() {
  fetch('/api/config/invites')
    .then(r => r.json())
    .then(data => {
      const config = data.config || {};
      const leaderboard = data.leaderboard || [];

      const enabledInput = document.getElementById('invites_enabled');
      const channelInput = document.getElementById('invites_log_channel');

      if (enabledInput) enabledInput.checked = config.enabled === 1;
      if (channelInput) channelInput.value = config.log_channel_id || '';

      if (channelInput && channelInput.syncCustomSelect) channelInput.syncCustomSelect();

      const list = document.getElementById('invite-leaderboard-list');
      if (list) {
        if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
          list.innerHTML = '<tr><td colspan="5" class="text-center">Aucune invitation enregistrée pour le moment.</td></tr>';
          return;
        }

        list.innerHTML = leaderboard.map((row, idx) => {
          const inviterMember = membersList.find(m => m.id === row.inviter_id);
          const name = inviterMember ? inviterMember.name : (row.inviter_id || 'Utilisateur inconnu');
          const medal = idx === 0 ? '🥇 ' : (idx === 1 ? '🥈 ' : (idx === 2 ? '🥉 ' : ''));
          return `
            <tr>
              <td><strong>${medal}${idx + 1}</strong></td>
              <td><i class="fa-solid fa-user" style="color:#d4af37;"></i> <strong>@${name}</strong></td>
              <td><span class="nav-badge badge-green">${row.regular || 0}</span></td>
              <td><span class="nav-badge badge-red">${row.left || 0}</span></td>
              <td><span class="nav-badge badge-gold" style="font-size: 0.95rem;">${row.total} invs</span></td>
            </tr>
          `;
        }).join('');
      }
    })
    .catch(console.error);
}

const formInvitesConfig = document.getElementById('form-invites-config');
if (formInvitesConfig) {
  formInvitesConfig.addEventListener('submit', (e) => {
    e.preventDefault();
    const enabled = document.getElementById('invites_enabled').checked ? 1 : 0;
    const log_channel_id = document.getElementById('invites_log_channel').value || null;

    fetch('/api/config/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_channel_id, enabled })
    })
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        showToast('Configuration des invitations enregistrée !');
        loadInviteTracker();
      } else {
        showToast('Erreur: ' + res.error, true);
      }
    })
    .catch(err => showToast('Erreur: ' + err.message, true));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSondageModule();
});

// ============================================================
// 🤖 COMMANDES PERSONNALISÉES (DASHBOARD 2)
// ============================================================
let ccCurrentActions = [];
let currentGuildRolesList = [];
let currentGuildShopItemsList = [];

function initCcActionsBuilder() {
  const select = document.getElementById('cc-add-action-select');
  if (!select) return;

  select.addEventListener('change', (e) => {
    const actType = e.target.value;
    if (!actType) return;
    addCcActionCard(actType);
    select.value = '';
  });
}

function addCcActionCard(type, initialData = {}) {
  const id = 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const cardData = { id, type, ...initialData };
  ccCurrentActions.push(cardData);
  renderCcActionsList();
}

function removeCcActionCard(id) {
  ccCurrentActions = ccCurrentActions.filter(a => a.id !== id);
  renderCcActionsList();
}

let currentGuildCommandsList = [];

function renderCcActionsList() {
  const container = document.getElementById('cc-actions-builder-container');
  if (!container) return;

  if (!ccCurrentActions.length) {
    container.innerHTML = `<div style="text-align: center; color: #72767d; border: 2px dashed #40444b; padding: 20px; border-radius: 8px; font-size: 0.85rem;">Aucune action configurée. Utilisez le menu <strong>"+ Ajouter une action"</strong> ci-dessus.</div>`;
    return;
  }

  const roles = (currentGuildRolesList && currentGuildRolesList.length) ? currentGuildRolesList : (typeof rolesList !== 'undefined' && Array.isArray(rolesList) ? rolesList : (window.guildRoles || []));

  container.innerHTML = ccCurrentActions.map((act, index) => {
    let title = '';
    let icon = '';
    let fields = '';

    if (act.type === 'reply') {
      title = 'Envoyer un message (Texte / Embed) (Optionnel)';
      icon = 'fa-comment-dots';
      fields = `
        <div style="margin-bottom: 8px;">
          <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">MESSAGE TEXTE (OPTIONNEL)</label>
          <textarea class="inner-input cc-act-field" data-id="${act.id}" data-key="text" rows="2" placeholder="Texte de réponse optionnel (ex: Merci {user} !)" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; border-radius:6px; padding:8px;">${act.text || ''}</textarea>
        </div>
        <details style="margin-top:6px; font-size:0.8rem; color:#00b894;">
          <summary style="cursor:pointer; font-weight:700;">🎨 Ajouter un Embed (Optionnel)</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:8px;">
            <input type="text" class="inner-input cc-act-field" data-id="${act.id}" data-key="title" placeholder="Titre d'embed" value="${act.title || ''}" style="background:#202225; border:1px solid #40444b; color:#fff; padding:6px; font-size:0.85rem;">
            <input type="color" class="inner-input cc-act-field" data-id="${act.id}" data-key="color" value="${act.color || '#5865F2'}" style="height:35px; width:100%; border:none; border-radius:4px; cursor:pointer;">
          </div>
          <textarea class="inner-input cc-act-field" data-id="${act.id}" data-key="description" rows="2" placeholder="Description de l'embed" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; margin-top:8px; padding:6px; font-size:0.85rem;">${act.description || ''}</textarea>
          <input type="text" class="inner-input cc-act-field" data-id="${act.id}" data-key="imageUrl" placeholder="URL Image de l'embed (ex: https://...)" value="${act.imageUrl || ''}" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; margin-top:8px; padding:6px; font-size:0.85rem;">
        </details>`;
    } else if (act.type === 'add_role') {
      title = 'Ajouter des rôles';
      icon = 'fa-user-plus';
      fields = `
        <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">SÉLECTIONNER LE RÔLE À AJOUTER</label>
        <select class="inner-input cc-act-field" data-id="${act.id}" data-key="roleId" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
          <option value="">-- Choisir un rôle (${roles.length} rôles disponibles) --</option>
          ${roles.map(r => `<option value="${r.id}" ${act.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>`;
    } else if (act.type === 'add_temp_role') {
      title = 'Ajouter un rôle temporaire';
      icon = 'fa-clock';
      fields = `
        <div style="display:grid; grid-template-columns:2fr 1fr; gap:10px;">
          <div>
            <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">RÔLE TEMPORAIRE</label>
            <select class="inner-input cc-act-field" data-id="${act.id}" data-key="roleId" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
              <option value="">-- Choisir un rôle (${roles.length} rôles disponibles) --</option>
              ${roles.map(r => `<option value="${r.id}" ${act.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">DURÉE</label>
            <select class="inner-input cc-act-field" data-id="${act.id}" data-key="durationMs" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
              <option value="3600000" ${act.durationMs == 3600000 ? 'selected' : ''}>1 Heure</option>
              <option value="43200000" ${act.durationMs == 43200000 ? 'selected' : ''}>12 Heures</option>
              <option value="86400000" ${act.durationMs == 86400000 ? 'selected' : ''}>24 Heures</option>
              <option value="259200000" ${act.durationMs == 259200000 ? 'selected' : ''}>3 Jours</option>
              <option value="604800000" ${act.durationMs == 604800000 ? 'selected' : ''}>7 Jours</option>
            </select>
          </div>
        </div>`;
    } else if (act.type === 'remove_role') {
      title = 'Retirer des rôles';
      icon = 'fa-user-minus';
      fields = `
        <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">RÔLE À RETIRER</label>
        <select class="inner-input cc-act-field" data-id="${act.id}" data-key="roleId" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
          <option value="">-- Choisir un rôle (${roles.length} rôles disponibles) --</option>
          ${roles.map(r => `<option value="${r.id}" ${act.roleId === r.id ? 'selected' : ''}>${r.name}</option>`).join('')}
        </select>`;
    } else if (act.type === 'give_item') {
      title = 'Article de boutique (Offrir un objet)';
      icon = 'fa-gift';
      const shopOpts = currentGuildShopItemsList.map(i => `<option value="${i.item_name}" ${act.itemName === i.item_name ? 'selected' : ''}>${i.item_name} (${i.price} 💰)</option>`).join('');

      fields = `
        <div style="display:grid; grid-template-columns:3fr 1fr; gap:10px;">
          <div>
            <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">SÉLECTIONNER UN OBJET DE LA BOUTIQUE</label>
            <select class="inner-input cc-act-field" data-id="${act.id}" data-key="itemName" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
              <option value="">-- Choisir un objet de la boutique --</option>
              ${shopOpts}
            </select>
            <input type="text" class="inner-input cc-act-field" data-id="${act.id}" data-key="itemNameCustom" placeholder="Ou saisissez un nom d'objet personnalisé" value="${act.itemNameCustom || (act.itemName && !currentGuildShopItemsList.some(i => i.item_name === act.itemName) ? act.itemName : '')}" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:6px; border-radius:6px; margin-top:6px;">
          </div>
          <div>
            <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">QUANTITÉ</label>
            <input type="number" class="inner-input cc-act-field" data-id="${act.id}" data-key="quantity" value="${act.quantity || 1}" min="1" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">
          </div>
        </div>`;
    } else if (act.type === 'add_money') {
      title = 'Ajouter de l\'argent / Karma';
      icon = 'fa-coins';
      fields = `
        <label style="font-size:0.75rem; color:#b9bbbe; font-weight:700;">MONTANT D'ARGENT À AJOUTER AU SOLDE</label>
        <input type="number" class="inner-input cc-act-field" data-id="${act.id}" data-key="amount" placeholder="ex: 500" value="${act.amount || 100}" style="width:100%; background:#202225; border:1px solid #40444b; color:#fff; padding:8px; border-radius:6px;">`;
    } else if (act.type === 'delete_trigger') {
      title = 'Supprimer le message déclencheuse';
      icon = 'fa-trash';
      fields = `<div style="font-size:0.85rem; color:#b9bbbe;">🗑️ Le message envoyé par l'utilisateur pour déclencher la commande sera automatiquement effacé par le bot.</div>`;
    }

    return `
      <div class="card glass inner-card" style="background: rgba(32, 34, 37, 0.9); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div style="font-weight: 700; color: #fff; font-size: 0.9rem;"><i class="fa-solid ${icon}" style="color: #d66d4b; margin-right: 6px;"></i> ${index + 1}. ${title}</div>
          <button type="button" class="btn btn-danger" style="padding: 3px 8px; font-size: 0.75rem;" onclick="removeCcActionCard('${act.id}')"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div>${fields}</div>
      </div>`;
  }).join('');

  container.querySelectorAll('.cc-act-field').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      const key = e.target.getAttribute('data-key');
      const val = e.target.value;
      const targetAct = ccCurrentActions.find(a => a.id === id);
      if (targetAct) {
        targetAct[key] = val;
        if (key === 'itemNameCustom' && val) {
          targetAct.itemName = val;
        }
      }
    });
  });
}
window.removeCcActionCard = removeCcActionCard;

function updateServerTagsDropdown() {
  const tagSelect = document.getElementById('cc-cond-tag-select');
  const tagValInput = document.getElementById('cc-cond-tag-val');
  if (!tagSelect) return;

  const fetchEndpoint = (url) => fetch(url).then(r => r.ok ? r.json() : null).catch(() => null);

  Promise.all([
    fetchEndpoint('/api/server-tags'),
    fetchEndpoint('/api/bot/server-tags'),
    fetchEndpoint('/api/guilds')
  ]).then(([res1, res2, guildsData]) => {
    let tagsList = [];
    if (res1 && res1.success && Array.isArray(res1.tags) && res1.tags.length > 0) {
      tagsList = res1.tags;
    } else if (res2 && res2.success && Array.isArray(res2.tags) && res2.tags.length > 0) {
      tagsList = res2.tags;
    } else if (Array.isArray(guildsData) && guildsData.length > 0) {
      tagsList = guildsData.map(g => ({ guildId: g.id, guildName: g.name, tag: g.name }));
    }

    const curVal = tagSelect.value || (tagValInput ? tagValInput.value : '');

    if (tagsList.length > 0) {
      tagSelect.innerHTML = '<option value="">-- Choisir le Tag d\'un Serveur --</option>' +
        tagsList.map(t => {
          const displayTag = t.tag || t.guildName;
          const isSelected = (displayTag === curVal || t.tag === curVal) ? 'selected' : '';
          return `<option value="${displayTag}" ${isSelected}>🏷️ [${displayTag}] — ${t.guildName}</option>`;
        }).join('');
      if (curVal) tagSelect.value = curVal;
    } else {
      tagSelect.innerHTML = '<option value="">-- Aucun serveur disponible --</option>';
    }
  }).catch(console.error);
}
window.updateServerTagsDropdown = updateServerTagsDropdown;

document.addEventListener('DOMContentLoaded', () => {
  initCcActionsBuilder();
  updateServerTagsDropdown();
});

function loadCustomCommands(guildId) {
  if (!guildId) return;

  Promise.all([
    fetch(`/api/roles?guildId=${guildId}`).then(r => r.json()).catch(() => []),
    fetch(`/api/shop-items/${guildId}`).then(r => r.json()).catch(() => ({ items: [] })),
    fetch(`/api/bot/custom-commands/${guildId}`).then(r => r.json()).catch(() => ({}))
  ]).then(([rolesData, shopData, cmdData]) => {
    currentGuildRolesList = Array.isArray(rolesData) ? rolesData : [];
    currentGuildShopItemsList = (shopData && Array.isArray(shopData.items)) ? shopData.items : [];

    const tagRoleSelect = document.getElementById('cc-cond-tag-role-select');
    if (tagRoleSelect) {
      const pendingVal = tagRoleSelect.getAttribute('data-pending-val') || tagRoleSelect.value;
      tagRoleSelect.innerHTML = `<option value="">-- Aucun rôle supplémentaire --</option>` +
        currentGuildRolesList.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
      if (pendingVal) tagRoleSelect.value = pendingVal;
    }

    const settings = cmdData.settings || {};
    const commands = cmdData.commands || [];
    currentGuildCommandsList = commands;

    const prefixInput = document.getElementById('cc-prefix-input');
    if (prefixInput) prefixInput.value = settings.prefix || '/';

    const deleteInput = document.getElementById('cc-delete-trigger-input');
    if (deleteInput) deleteInput.checked = (settings.delete_trigger == 1 || settings.delete_trigger === true);

    updateServerTagsDropdown();

    renderCustomCommands(commands, guildId);
    renderCcActionsList();
  }).catch(console.error);
}

function renderCustomCommands(commands, guildId) {
  const tbody = document.getElementById('cc-table-tbody');
  if (!tbody) return;

  if (!commands || !commands.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#b9bbbe; padding:20px;">Aucune commande personnalisée créée.</td></tr>`;
    return;
  }

  const prefix = document.getElementById('cc-prefix-input')?.value || '/';

  tbody.innerHTML = commands.map(cmd => {
    let actions = [];
    try { actions = JSON.parse(cmd.actions_json || '[]'); } catch(e) {}
    const textAction = actions.find(a => a.type === 'text' || a.type === 'reply');
    const preview = textAction ? (textAction.text || textAction.content || '').substring(0, 60) + ((textAction.text || textAction.content || '').length > 60 ? '…' : '') : `[${actions.length} action(s)]`;
    return `<tr>
      <td><strong style="color:#5865F2;">${prefix}${cmd.command_name}</strong></td>
      <td style="color:#b9bbbe; font-size:0.85rem;">${cmd.description || '—'}</td>
      <td style="color:#dcddde; font-size:0.85rem;">${preview}</td>
      <td style="text-align:center;">
        <button type="button" class="btn btn-primary" style="padding:5px 10px; font-size:0.78rem; margin-right:5px; background:#e17055; border:none;" onclick="editCustomCommand('${guildId}','${cmd.command_name}')" title="Modifier">
          <i class="fa-solid fa-pen-to-square"></i>
        </button>
        <button type="button" class="btn btn-danger" style="padding:5px 10px; font-size:0.78rem;" onclick="deleteCustomCommand('${guildId}','${cmd.command_name}')" title="Supprimer">
          <i class="fa-solid fa-trash"></i>
        </button>
      </td>
    </tr>`;
  }).join('');
}

function editCustomCommand(guildId, commandName) {
  const cmd = currentGuildCommandsList.find(c => c.command_name.toLowerCase() === commandName.toLowerCase());
  if (!cmd) return showToast('❌ Commande introuvable.', true);

  const nameInput = document.getElementById('cc-name-input');
  if (nameInput) nameInput.value = cmd.command_name;

  const descInput = document.getElementById('cc-desc-input');
  if (descInput) descInput.value = cmd.description || '';

  // Conditions
  let conditions = [];
  try { conditions = JSON.parse(cmd.conditions_json || '[]'); } catch(e) {}

  const tagCheck = document.getElementById('cc-cond-tag-check');
  const tagVal = document.getElementById('cc-cond-tag-val');
  const tagRoleSelect = document.getElementById('cc-cond-tag-role-select');
  const boosterCheck = document.getElementById('cc-cond-booster-check');
  const refusalMsg = document.getElementById('cc-cond-refusal-msg');

  const tagSelect = document.getElementById('cc-cond-tag-select');
  if (tagCheck) tagCheck.checked = false;
  if (tagVal) tagVal.value = '';
  if (tagSelect) tagSelect.value = '';
  if (tagRoleSelect) {
    tagRoleSelect.value = '';
    tagRoleSelect.removeAttribute('data-pending-val');
  }
  if (boosterCheck) boosterCheck.checked = false;
  if (refusalMsg) refusalMsg.value = '';

  for (const cond of conditions) {
    if (cond.type === 'has_server_tag') {
      if (tagCheck) tagCheck.checked = true;
      if (tagVal) tagVal.value = cond.tag || '';
      if (tagSelect && cond.tag) tagSelect.value = cond.tag;
      if (tagRoleSelect && cond.autoRoleId) {
        tagRoleSelect.value = cond.autoRoleId;
        tagRoleSelect.setAttribute('data-pending-val', cond.autoRoleId);
      }
    } else if (cond.type === 'is_booster') {
      if (boosterCheck) boosterCheck.checked = true;
    }
    if (cond.refusalMessage && refusalMsg) refusalMsg.value = cond.refusalMessage;
  }

  // Actions
  let actions = [];
  try { actions = JSON.parse(cmd.actions_json || '[]'); } catch(e) {}

  const replyTextAction = actions.find(a => a.type === 'reply' || a.type === 'text');
  const textReplyInput = document.getElementById('cc-text-reply');
  if (textReplyInput) {
    textReplyInput.value = replyTextAction ? (replyTextAction.text || replyTextAction.content || '') : '';
  }

  ccCurrentActions = actions.map((a, i) => ({
    id: 'act_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 4),
    ...a
  }));

  renderCcActionsList();

  const form = document.getElementById('form-add-custom-command');
  if (form) {
    form.scrollIntoView({ behavior: 'smooth' });
  }

  const prefix = document.getElementById('cc-prefix-input')?.value || '/';
  showToast(`🖊️ Commande ${prefix}${cmd.command_name} chargée pour modification !`);
}
window.editCustomCommand = editCustomCommand;

function deleteCustomCommand(guildId, commandName) {
  const prefix = document.getElementById('cc-prefix-input')?.value || '/';
  if (!confirm(`Supprimer la commande ${prefix}${commandName} ?`)) return;
  fetch(`/api/bot/custom-commands/${guildId}/${encodeURIComponent(commandName)}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => { showToast('✅ Commande supprimée.'); loadCustomCommands(guildId); })
    .catch(() => showToast('❌ Erreur lors de la suppression.', true));
}
window.deleteCustomCommand = deleteCustomCommand;
window.loadCustomCommands = loadCustomCommands;

// Event Delegation pour la sauvegarde des paramètres de commande
document.addEventListener('click', async (e) => {
  const btnSettings = e.target.closest('#cc-save-settings-btn');
  if (btnSettings) {
    e.preventDefault();
    const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    if (!guildId) return showToast('❌ Sélectionnez un serveur.', true);

    const prefix = document.getElementById('cc-prefix-input')?.value || '/';
    const delete_trigger = document.getElementById('cc-delete-trigger-input')?.checked ? 1 : 0;

    try {
      const res = await fetch(`/api/bot/custom-commands/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, delete_trigger })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✅ Paramètres de commandes enregistrés !');
      } else {
        showToast(`❌ ${data.error || 'Erreur'}`, true);
      }
    } catch(err) {
      showToast(`❌ Erreur réseau : ${err.message}`, true);
    }
  }
});

// Event Delegation pour la création de commande personnalisée
document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'form-add-custom-command') {
    e.preventDefault();
    const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    if (!guildId) return showToast('❌ Sélectionnez un serveur.', true);

    const commandName = document.getElementById('cc-name-input')?.value?.trim().replace(/^\//, '');
    const description = document.getElementById('cc-desc-input')?.value?.trim();

    if (!commandName) return showToast('❌ Nom de commande requis.', true);

    // Collect conditions
    const conditions = [];
    const refusalMsg = document.getElementById('cc-cond-refusal-msg')?.value?.trim();
    const isTagChecked = document.getElementById('cc-cond-tag-check')?.checked;
    const tagVal = document.getElementById('cc-cond-tag-val')?.value?.trim();
    const tagRoleId = document.getElementById('cc-cond-tag-role-select')?.value;
    if (isTagChecked || tagVal || tagRoleId) {
      conditions.push({ type: 'has_server_tag', tag: tagVal || '', autoRoleId: tagRoleId || null, refusalMessage: refusalMsg });
    }
    if (document.getElementById('cc-cond-booster-check')?.checked) {
      conditions.push({ type: 'is_booster', refusalMessage: refusalMsg });
    }

    // Collect actions
    const finalActions = ccCurrentActions.map(a => {
      const clean = { ...a };
      delete clean.id;
      return clean;
    });

    const textReply = document.getElementById('cc-text-reply')?.value?.trim();
    if (textReply && !finalActions.some(a => a.type === 'reply' || a.type === 'text')) {
      finalActions.unshift({ type: 'reply', text: textReply });
    }

    if (!finalActions.length) {
      return showToast('❌ Veuillez saisir un message de réponse ou ajouter au moins une action.', true);
    }

    try {
      const res = await fetch(`/api/bot/custom-commands/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command_name: commandName,
          description,
          actions_json: JSON.stringify(finalActions),
          conditions_json: JSON.stringify(conditions)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('✅ Commande enregistrée avec succès !');
        e.target.reset();
        ccCurrentActions = [];
        loadCustomCommands(guildId);
      } else {
        showToast(`❌ ${data.error || 'Erreur création commande'}`, true);
      }
    } catch(err) {
      showToast(`❌ Erreur réseau : ${err.message}`, true);
    }
  }
});

// ============================================================
// 💬 RÉACTIONS DE MOTS (DASHBOARD 2)
// ============================================================
function addEmojiToWrInput(emojiTag) {
  const input = document.getElementById('wr-emojis-input');
  if (!input) return;
  const current = input.value.trim();
  if (current) {
    input.value = current + ' ' + emojiTag;
  } else {
    input.value = emojiTag;
  }
  if (typeof showToast === 'function') showToast(`✨ Émoji ajouté !`);
}
window.addEmojiToWrInput = addEmojiToWrInput;

function loadWordReactions(guildId) {
  if (!guildId) return;

  fetch(`/api/emojis?guildId=${guildId}`)
    .then(r => r.json())
    .then(emojis => {
      const picker = document.getElementById('wr-server-emojis-picker');
      if (picker) {
        if (Array.isArray(emojis) && emojis.length > 0) {
          picker.innerHTML = emojis.map(e => `
            <button type="button" class="btn" onclick="addEmojiToWrInput('${e.identifier}')" title="${e.name}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); padding: 4px 8px; border-radius: 6px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: #fff; font-size: 0.8rem; transition: background 0.2s;">
              <img src="${e.url}" alt="${e.name}" style="width: 22px; height: 22px; object-fit: contain;">
              <span>:${e.name}:</span>
            </button>
          `).join('');
        } else {
          picker.innerHTML = `<span style="font-size: 0.8rem; color: #72767d;">Aucun émoji personnalisé trouvé sur ce serveur. Vous pouvez saisir des émojis standards ci-dessus (ex: 👋, ❤️, 🔥).</span>`;
        }
      }
    })
    .catch(() => {
      const picker = document.getElementById('wr-server-emojis-picker');
      if (picker) picker.innerHTML = `<span style="font-size: 0.8rem; color: #72767d;">Saisissez vos émojis manuellement.</span>`;
    });

  fetch(`/api/bot/word-reactions/${guildId}`)
    .then(r => r.json())
    .then(data => {
      const settings = data.settings || {};
      const reactions = data.reactions || [];

      const globalToggle = document.getElementById('wr-global-toggle');
      if (globalToggle) globalToggle.checked = settings.is_enabled !== false;

      renderWordReactions(reactions, guildId);
    })
    .catch(console.error);
}

function renderWordReactions(reactions, guildId) {
  const container = document.getElementById('wr-container-list');
  if (!container) return;

  if (!reactions || !reactions.length) {
    container.innerHTML = `<p style="color:#b9bbbe; text-align:center; padding:20px;">Aucune réaction de mot configurée.</p>`;
    return;
  }

  container.innerHTML = reactions.map(r => {
    let emojis = [];
    try { emojis = JSON.parse(r.emojis_json || '[]'); } catch(e) {}
    const emojiStr = Array.isArray(emojis) ? emojis.join(' ') : (r.emojis_json || '');
    return `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:rgba(47,49,54,0.6); border-radius:8px; border:1px solid rgba(255,255,255,0.08); margin-bottom:10px; flex-wrap:wrap; gap:10px;">
      <div>
        <strong style="color:#dcddde;">🔤 ${r.trigger_word}</strong>
        <span style="color:#b9bbbe; font-size:0.85rem; margin-left:12px;">→ ${emojiStr || '(aucun)'}</span>
      </div>
      <button type="button" class="btn btn-danger" style="padding:5px 10px; font-size:0.78rem;" onclick="deleteWordReaction('${guildId}','${r.id}')">
        <i class="fa-solid fa-trash"></i> Supprimer
      </button>
    </div>`;
  }).join('');
}

function deleteWordReaction(guildId, id) {
  if (!confirm('Supprimer cette réaction ?')) return;
  fetch(`/api/bot/word-reactions/${guildId}/${id}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => { showToast('✅ Réaction supprimée.'); loadWordReactions(guildId); })
    .catch(() => showToast('❌ Erreur lors de la suppression.', true));
}
window.deleteWordReaction = deleteWordReaction;
window.loadWordReactions = loadWordReactions;

(function initWordReactionsListeners() {
  const form = document.getElementById('form-add-word-reaction');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
      if (!guildId) return showToast('❌ Sélectionnez un serveur.', true);

      const triggerWord = document.getElementById('wr-trigger-input')?.value?.trim();
      const emojisRaw = document.getElementById('wr-emojis-input')?.value?.trim();

      if (!triggerWord || !emojisRaw) return showToast('❌ Mot et émojis requis.', true);

      const emojis = emojisRaw.split(/[\s,]+/).filter(Boolean);

      try {
        const res = await fetch(`/api/bot/word-reactions/${guildId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger_word: triggerWord, emojis_json: JSON.stringify(emojis) })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast('✅ Réaction de mot ajoutée !');
          form.reset();
          loadWordReactions(guildId);
        } else {
          showToast(`❌ ${data.error || 'Erreur création réaction'}`, true);
        }
      } catch(err) {
        showToast(`❌ Erreur réseau : ${err.message}`, true);
      }
    });
  }
})();

// ============================================================
// 🖼️ LOGO BOT SERVEUR & IDENTITÉ (DASHBOARD 2)
// ============================================================
function loadServerBotProfile(guildId) {
  if (!guildId) return;
  fetch(`/api/bot/server-bot-profile/${guildId}`)
    .then(r => r.json())
    .then(profile => {
      const logoInput = document.getElementById('sbp-logo-url');
      const nameInput = document.getElementById('sbp-name-input');
      const previewImg = document.getElementById('sbp-preview-img');

      if (logoInput) logoInput.value = profile.custom_logo_url || '';
      if (nameInput) nameInput.value = profile.custom_name || '';

      if (profile.custom_logo_url) {
        if (previewImg) {
          previewImg.src = profile.custom_logo_url;
          previewImg.onerror = () => { previewImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; };
        }
      } else {
        fetch('/api/bot/info')
          .then(res => res.json())
          .then(info => {
            if (previewImg && info.avatarURL) previewImg.src = info.avatarURL;
          })
          .catch(() => {
            if (previewImg) previewImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
          });
      }

      if (typeof fetchBotInfo === 'function') {
        fetchBotInfo(profile.custom_logo_url || null);
      }
    })
    .catch(console.error);
}
window.loadServerBotProfile = loadServerBotProfile;

// Event Delegation pour le profil du bot serveur (clic téléversement, réinitialisation, changement fichier, saisie URL, soumission formulaire)
document.addEventListener('click', async (e) => {
  const btnUpload = e.target.closest('#btn-upload-sbp-logo');
  if (btnUpload) {
    e.preventDefault();
    const fileInput = document.getElementById('sbp-file-input');
    if (fileInput) fileInput.click();
    return;
  }

  const btnReset = e.target.closest('#btn-reset-sbp-logo');
  if (btnReset) {
    e.preventDefault();
    const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    if (!guildId) return showToast('❌ Sélectionnez un serveur.', true);

    if (!confirm('Réinitialiser le logo et nom personnalisés pour ce serveur ? L\'avatar par défaut du Portail Développeur Discord sera restauré.')) return;

    try {
      if (typeof showToast === 'function') showToast('⏳ Réinitialisation de l\'avatar...');
      const res = await fetch(`/api/bot/server-bot-profile/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_logo_url: null, custom_name: null })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const logoInput = document.getElementById('sbp-logo-url');
        const nameInput = document.getElementById('sbp-name-input');
        const previewImg = document.getElementById('sbp-preview-img');

        if (logoInput) logoInput.value = '';
        if (nameInput) nameInput.value = '';
        
        fetch('/api/bot/info')
          .then(res => res.json())
          .then(info => {
            if (previewImg && info.avatarURL) previewImg.src = info.avatarURL;
          })
          .catch(() => {
            if (previewImg) previewImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
          });

        if (typeof showToast === 'function') showToast('✅ Logo et nom personnalisés retirés ! Avatar par défaut restauré.');
        if (typeof fetchBotInfo === 'function') fetchBotInfo(null);
      } else {
        if (typeof showToast === 'function') showToast(`❌ ${data.error || 'Erreur lors de la réinitialisation'}`, true);
      }
    } catch (err) {
      console.error('Erreur réinitialisation logo serveur:', err);
      if (typeof showToast === 'function') showToast('❌ Erreur de connexion lors de la réinitialisation.', true);
    }
    return;
  }

  const btnGlobal = e.target.closest('#btn-set-global-logo');
  if (btnGlobal) {
    e.preventDefault();
    const logoInput = document.getElementById('sbp-logo-url');
    const avatar_url = logoInput ? logoInput.value.trim() : '';
    if (!avatar_url) return showToast('❌ Saisissez une URL d\'image ou téléversez une image d\'abord.', true);

    if (!confirm('Appliquer cette image comme Logo Global du Bot sur l\'ensemble de Discord (tous les serveurs) ?')) return;

    try {
      showToast('⏳ Application du Logo Global sur Discord...');
      const res = await fetch('/api/bot/global-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('🌐 Logo Global du Bot mis à jour avec succès sur tous les serveurs Discord !');
        const previewImg = document.getElementById('sbp-preview-img');
        if (previewImg) previewImg.src = data.avatarURL || avatar_url;
      } else {
        showToast(`❌ ${data.error || 'Erreur lors de la mise à jour globale'}`, true);
      }
    } catch (err) {
      console.error('Erreur global logo:', err);
      showToast('❌ Erreur de connexion lors de la mise à jour globale.', true);
    }
  }
});

document.addEventListener('change', async (e) => {
  if (e.target && e.target.id === 'sbp-file-input') {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const logoInput = document.getElementById('sbp-logo-url');
    const previewImg = document.getElementById('sbp-preview-img');

    try {
      if (typeof showToast === 'function') showToast('⏳ Téléversement de l\'image en cours...');
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && (data.url || data.path)) {
        const uploadedUrl = data.url || data.path;
        if (logoInput) logoInput.value = uploadedUrl;
        if (previewImg) previewImg.src = uploadedUrl;
        if (typeof showToast === 'function') showToast('✅ Image téléversée avec succès !');
      } else {
        if (typeof showToast === 'function') showToast(`❌ Erreur téléversement : ${data.error || 'Erreur inconnue'}`, true);
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast(`❌ Erreur réseau : ${err.message}`, true);
    }
  }
});

document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'sbp-logo-url') {
    const url = e.target.value.trim();
    const previewImg = document.getElementById('sbp-preview-img');
    if (previewImg) {
      if (url) {
        previewImg.src = url;
        previewImg.onerror = () => { previewImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; };
      } else {
        previewImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
      }
    }
  }
});

document.addEventListener('submit', async (e) => {
  if (e.target && e.target.id === 'form-server-bot-profile') {
    e.preventDefault();
    e.stopPropagation();

    const guildId = document.getElementById('guild-select')?.value || (typeof guildSelect !== 'undefined' ? guildSelect?.value : null);
    if (!guildId) return showToast('❌ Sélectionnez un serveur.', true);

    const custom_logo_url = document.getElementById('sbp-logo-url')?.value?.trim() || null;
    const custom_name = document.getElementById('sbp-name-input')?.value?.trim() || null;

    try {
      if (typeof showToast === 'function') showToast('⏳ Enregistrement du logo et du nom...');
      const res = await fetch(`/api/bot/server-bot-profile/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ custom_logo_url, custom_name })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (typeof showToast === 'function') showToast('✅ Logo et nom du bot enregistrés avec succès !');
        if (typeof fetchBotInfo === 'function') fetchBotInfo(custom_logo_url);
      } else {
        if (typeof showToast === 'function') showToast(`❌ ${data.error || 'Erreur lors de l\'enregistrement'}`, true);
      }
    } catch (err) {
      console.error('Erreur enregistrement logo serveur:', err);
      if (typeof showToast === 'function') showToast('❌ Erreur de connexion lors de l\'enregistrement.', true);
    }
  }
});


