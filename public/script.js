// script.js
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
      document.getElementById(tabId).classList.add('active');
      
      // Fermer le menu mobile lors du clic sur un onglet
      if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
      }

      if (tabId === 'tab-gifs') {
        fetchAndRenderGifs();
      } else if (tabId === 'tab-map') {
        const guildId = guildSelect.value;
        document.getElementById('map-iframe').src = `map.html?guild=${guildId}`;
      }
    });
  });

  // Verify auth state
  fetch('/api/user', { cache: 'no-store' })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        currentUser = data.user;
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
        if (data.guildId) {
          guildSelect.value = data.guildId;
          handleGuildSelection(data.guildId);
        }
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
        // Trigger select-guild API
        fetch('/api/select-guild', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guildId: guild.id })
        })
        .then(res => res.json())
        .then(() => handleGuildSelection(guild.id))
        .catch(console.error);
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

    // Save choice in session
    fetch('/api/select-guild', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guildId })
    })
      .then(res => res.json())
      .then(() => handleGuildSelection(guildId))
      .catch(console.error);
  });

  const activeGuildTrigger = document.getElementById('active-guild-trigger');
  if (activeGuildTrigger) {
    activeGuildTrigger.addEventListener('click', () => {
      guildSelect.value = '';
      fetch('/api/select-guild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId: '' })
      })
      .then(res => res.json())
      .then(() => {
        guildSelect.dispatchEvent(new Event('change'));
      })
      .catch(console.error);
    });
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
    noGuildSelected.style.display = 'none';
    configForms.style.display = 'block';
    
    updateActiveGuildIcon(guildId);

    // 1. Fetch channels, roles & members
    await Promise.all([
      fetch('/api/channels').then(res => res.json()).then(data => { channelsList = data; }),
      fetch('/api/roles').then(res => res.json()).then(data => { rolesList = data; }),
      fetch('/api/members').then(res => res.json()).then(data => { membersList = data; })
    ]).catch(console.error);

    // 2. Populate selects
    populateDropdowns();

    // 3. Load guild config
    loadGuildConfiguration();
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
        select.innerHTML = '<option value="dm">💬 Message Privé (DM - Éphémère)</option>';
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
    if (ticketPingSelect) {
      ticketPingSelect.innerHTML = '';
      rolesList.forEach(r => {
        const option = document.createElement('option');
        option.value = r.id;
        option.textContent = r.name;
        ticketPingSelect.appendChild(option);
      });
    }

    // Synchroniser tous les sélecteurs de recherche personnalisés
    document.querySelectorAll('.channel-select, .announce-channel-select, .role-select, .custom-select').forEach(select => {
      if (select.syncCustomSelect) {
        select.syncCustomSelect();
      }
    });
  }

  function loadGuildConfiguration() {
    fetch('/api/config')
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
        updateInteractiveEditor();

        // Confessions (salons multiples)
        confessionsListState = config.confessions || [];
        renderConfessions(confessionsListState);

        // Jeu Mot Caché
        const game = config.game_config || {};
        document.getElementById('game_is_active').checked = !!game.is_active;
        document.getElementById('game_secret_phrase').value = game.secret_phrase || '';
        document.getElementById('game_reward_money').value = game.reward_money ?? 0;
        document.getElementById('game_reward_xp').value = game.reward_xp ?? 0;
        document.getElementById('game_reward_role_id').value = game.reward_role_id || '';
        document.getElementById('game_appearance_chance').value = game.appearance_chance ?? 15;
        document.getElementById('game_letter_emoji').value = game.letter_emoji || '🔍';
        const announceChanSel = document.getElementById('game_announce_channel');
        if (announceChanSel) {
          announceChanSel.value = game.announce_channel || 'dm';
          if (announceChanSel.syncCustomSelect) announceChanSel.syncCustomSelect();
        }
        document.getElementById('game_reset_progress').checked = false;

        // Quarantaine
        const quar = config.quarantine || {};
        document.getElementById('quarantine_role').value = quar.role_id || '';
        document.getElementById('quarantine_channel').value = quar.channel_id || '';

        // Logs
        const logs = config.logs || {};
        let channelMap = {};
        try {
          if (logs.channel_id && logs.channel_id.startsWith('{')) {
            channelMap = JSON.parse(logs.channel_id);
          } else if (logs.channel_id) {
            const legId = logs.channel_id;
            channelMap = {
              messages: legId,
              members: legId,
              voice: legId,
              moderation: legId,
              structure: legId,
              bots: legId,
              confessions: legId
            };
          }
        } catch (e) {
          console.error(e);
        }

        const activeCategories = logs.events ? logs.events.split(',') : [];
        const isLegacyAll = !logs.events || logs.events === 'all';
        const categories = ['messages', 'members', 'voice', 'moderation', 'structure', 'bots', 'confessions'];
        
        categories.forEach(cat => {
          const enableCb = document.getElementById(`log_enable_${cat}`);
          const channelSel = document.getElementById(`log_channel_${cat}`);
          if (enableCb) {
            enableCb.checked = isLegacyAll ? true : activeCategories.includes(cat);
          }
          if (channelSel) {
            channelSel.value = channelMap[cat] || '';
          }
        });

        // Shop Items
        renderShopItems(config.shop || []);

        // Level Rewards
        renderLevelRewards(config.level_rewards || []);

        // Leveling Config
        const lvl = config.leveling_config || {};
        document.getElementById('xp_min').value = lvl.xp_min ?? 15;
        document.getElementById('xp_max').value = lvl.xp_max ?? 25;
        document.getElementById('xp_base').value = lvl.xp_base ?? 120;
        document.getElementById('xp_factor').value = lvl.xp_factor ?? 1.35;
        document.getElementById('karma_min').value = lvl.karma_min ?? 1;
        document.getElementById('karma_max').value = lvl.karma_max ?? 3;
        document.getElementById('money_min').value = lvl.money_min ?? 2;
        document.getElementById('money_max').value = lvl.money_max ?? 5;
        document.getElementById('nsfw_xp_reward').value = lvl.nsfw_xp_reward ?? 0;
        document.getElementById('nsfw_money_reward').value = lvl.nsfw_money_reward ?? 0;
        document.getElementById('announce_channel').value = lvl.announce_channel || 'current';
        document.getElementById('announce_msg').value = lvl.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !';
        
        if (typeof updateXpCurvePreview === 'function') {
          updateXpCurvePreview();
        }

        // Automod Config
        const am = config.automod_config || {};
        document.getElementById('automod_anti_link').checked = am.anti_link === 1;
        document.getElementById('automod_anti_spam').checked = am.anti_spam === 1;
        document.getElementById('automod_anti_massmention').checked = am.anti_massmention === 1;
        document.getElementById('automod_anti_badwords').checked = am.anti_badwords === 1;
        document.getElementById('automod_spam_max_msgs').value = am.spam_max_msgs ?? 5;
        document.getElementById('automod_massmention_limit').value = am.massmention_limit ?? 5;
        document.getElementById('automod_badwords_list').value = am.badwords_list || '';
        document.getElementById('automod_bypass_roles').value = am.bypass_roles || '';

        // Auto-rôles & Counting renders
        renderAutoroleJoin(config.autoroles_on_join || []);
        renderAutoroleRole(config.autoroles_on_role || []);
        renderActiveAutoroles(config.autorole_embeds || []);
        renderCountingChannels(config.counting_channels || []);
        if (typeof updateAutorolePreview === 'function') updateAutorolePreview();

        // Permissions Configuration
        const perms = config.permissions_config || {};
        const adminRoleSel = document.getElementById('perm_admin_role_id');
        const modoRoleSel = document.getElementById('perm_modo_role_id');
        if (adminRoleSel) {
          adminRoleSel.value = perms.admin_role_id || '';
          if (adminRoleSel.syncCustomSelect) adminRoleSel.syncCustomSelect();
        }
        if (modoRoleSel) {
          modoRoleSel.value = perms.modo_role_id || '';
          if (modoRoleSel.syncCustomSelect) modoRoleSel.syncCustomSelect();
        }

        // Charger la configuration Karma
        fetch('/api/config/karma')
          .then(res => res.json())
          .then(karma => {
            document.getElementById('karma_is_active').checked = !!karma.is_active;
            document.getElementById('karma_announce_rewards').checked = !!karma.announce_rewards;
            document.getElementById('karma_threshold_1').value = karma.threshold_1 ?? 20;
            document.getElementById('karma_xp_mult_1').value = karma.xp_mult_1 ?? 1.2;
            document.getElementById('karma_discount_1').value = karma.discount_1 ?? 5;
            document.getElementById('karma_threshold_2').value = karma.threshold_2 ?? 50;
            document.getElementById('karma_xp_mult_2').value = karma.xp_mult_2 ?? 1.5;
            document.getElementById('karma_discount_2').value = karma.discount_2 ?? 10;
            document.getElementById('karma_threshold_3').value = karma.threshold_3 ?? 100;
            document.getElementById('karma_xp_mult_3').value = karma.xp_mult_3 ?? 2.0;
            document.getElementById('karma_discount_3').value = karma.discount_3 ?? 20;
          })
          .catch(console.error);

        // Charger la configuration des Forums Illimités (Cases à cocher)
        fetch('/api/config/unlimited-forums')
          .then(res => res.json())
          .then(data => {
            const checkboxes = document.querySelectorAll('.forum-checkbox');
            checkboxes.forEach(cb => {
              cb.checked = data.channels && data.channels.includes(cb.value);
            });
          })
          .catch(console.error);

        // Charger la configuration des Salons Action ou Vérité
        fetch('/api/config/action-verite/channels')
          .then(res => res.json())
          .then(config => {
            document.getElementById('av_sfw_channel').value = config.sfw_channel_id || '';
            document.getElementById('av_nsfw_channel').value = config.nsfw_channel_id || '';
            
            const sfwSelect = document.getElementById('av_sfw_channel');
            const nsfwSelect = document.getElementById('av_nsfw_channel');
            if (sfwSelect.syncCustomSelect) sfwSelect.syncCustomSelect();
            if (nsfwSelect.syncCustomSelect) nsfwSelect.syncCustomSelect();
          })
          .catch(console.error);

        // Charger la liste Action ou Vérité
        fetch('/api/config/action-verite')
          .then(res => res.json())
          .then(items => {
            renderActionVerite(items);
          })
          .catch(console.error);

        // Charger la configuration des Tickets (Panel et Options)
        fetch('/api/config/tickets')
          .then(res => res.json())
          .then(data => {
            const panel = data.panel;
            const options = data.options;

            // Remplir le formulaire du Panel
            document.getElementById('ticket_panel_title').value = panel.title || '';
            document.getElementById('ticket_panel_desc').value = panel.description || '';
            document.getElementById('ticket_panel_color').value = panel.color || '#5865f2';
            document.getElementById('ticket_panel_selector').value = panel.selector_type || 'select';
            document.getElementById('ticket_panel_channel').value = panel.channel_id || '';
            document.getElementById('ticket_panel_thumbnail').checked = !!panel.thumbnail;
            document.getElementById('ticket_panel_image_url').value = panel.image_url || '';

            // Synchroniser les custom selects du panel
            const channelSel = document.getElementById('ticket_panel_channel');
            const selectorSel = document.getElementById('ticket_panel_selector');
            if (channelSel.syncCustomSelect) channelSel.syncCustomSelect();
            if (selectorSel.syncCustomSelect) selectorSel.syncCustomSelect();

            // Mettre à jour l'aperçu en direct
            updateTicketPreview(panel, options);

            // Rendre la liste des options de ticket
            renderTicketOptions(options);
          })
          .catch(console.error);

        // Charger la configuration des Gains des Actions
        fetch('/api/config/action-rewards')
          .then(res => res.json())
          .then(rewards => {
            actionRewardsState = rewards;
            updateActionRewardsForm();
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
      })
      .catch(console.error);
  }

  // --- INTERACTIVE EMBED EDITOR BINDINGS ---

  function updateInteractiveEditor() {
    const mode = document.getElementById('edit-mode-select').value;
    const data = mode === 'welcome' ? welcomeData : leaveData;

    document.getElementById('target-channel-select').value = data.channel_id;
    document.getElementById('embed-color-picker').value = data.color;
    document.getElementById('embed-title-input').value = data.title;
    document.getElementById('embed-desc-field').value = data.desc;
    document.getElementById('discord-left-bar').style.borderColor = data.color;
    document.getElementById('embed-thumbnail-checkbox').checked = data.thumbnail;
    
    // Author Name and Icon
    document.getElementById('embed-author-name-input').value = data.author_name;
    document.getElementById('embed-author-icon-input').value = data.author_icon;
    const authorImg = document.getElementById('embed-author-icon-img');
    const authorIconWrapper = document.getElementById('author-icon-wrapper');
    if (data.author_icon) {
      authorImg.src = data.author_icon;
      authorImg.style.display = 'block';
      authorIconWrapper.style.display = 'flex';
    } else {
      authorImg.style.display = 'none';
      authorIconWrapper.style.display = 'none';
    }

    // Footer
    document.getElementById('embed-footer-input').value = data.footer;

    const filterGroup = document.getElementById('welcome-role-filter-group');
    if (mode === 'welcome') {
      filterGroup.style.display = 'block';
      document.getElementById('welcome-role-filter-select').value = welcomeData.role_filter || '';
    } else {
      filterGroup.style.display = 'none';
    }

    if (data.thumbnail) {
      document.getElementById('discord-thumbnail-img').style.display = 'block';
      document.getElementById('thumbnail-toggle-text').textContent = 'Photo Active';
      document.getElementById('discord-thumbnail-box').style.opacity = '1';
    } else {
      document.getElementById('discord-thumbnail-img').style.display = 'none';
      document.getElementById('thumbnail-toggle-text').textContent = 'Masquée';
      document.getElementById('discord-thumbnail-box').style.opacity = '0.6';
    }

    if (data.image_url) {
      document.getElementById('discord-image-img').src = data.image_url;
      document.getElementById('discord-image-img').style.display = 'block';
      document.getElementById('discord-image-overlay').style.display = 'none';
      document.getElementById('embed-image-input').value = data.image_url;
      document.getElementById('image-url-wrapper').style.display = 'flex';
    } else {
      document.getElementById('discord-image-img').style.display = 'none';
      document.getElementById('discord-image-overlay').style.display = 'flex';
      document.getElementById('embed-image-input').value = '';
      document.getElementById('image-url-wrapper').style.display = 'none';
    }
  }

  function fetchBotInfo(customAvatar = null) {
    fetch('/api/bot/info')
      .then(res => res.json())
      .then(info => {
        const avatarUrl = customAvatar || info.avatarURL || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const botAvatars = document.querySelectorAll('#bot-avatar-preview, #autorole-bot-avatar-preview');
        botAvatars.forEach(img => {
          img.src = avatarUrl;
        });
        document.querySelectorAll('.discord-bot-name').forEach(el => {
          el.textContent = info.username || 'Bagbot Elite';
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
      use_thread: 0
    });
    renderConfessions(confessionsListState);
  });

  function renderConfessions(channels) {
    confessionsList.innerHTML = '';
    
    if (channels.length === 0) {
      confessionsList.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="color: #8e9297;">Aucun salon de confession configuré. Cliquez sur le bouton ci-dessous pour en ajouter un.</td>
        </tr>
      `;
      return;
    }
    
    channels.forEach((ch, idx) => {
      const row = document.createElement('tr');
      
      // Target channel select
      const tdChannel = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'inner-select';
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
      
      // Custom title input
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
      
      // Thread checkbox
      const tdThread = document.createElement('td');
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
      
      // Actions delete button
      const tdActions = document.createElement('td');
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

        // Synchroniser les custom selects du formulaire
        ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users'].forEach(id => {
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
    const data = {
      is_active: document.getElementById('game_is_active').checked,
      secret_phrase: document.getElementById('game_secret_phrase').value,
      reward_money: parseInt(document.getElementById('game_reward_money').value) || 0,
      reward_xp: parseInt(document.getElementById('game_reward_xp').value) || 0,
      reward_role_id: document.getElementById('game_reward_role_id').value || null,
      appearance_chance: parseFloat(document.getElementById('game_appearance_chance').value) ?? 15,
      letter_emoji: document.getElementById('game_letter_emoji').value || '🔍',
      announce_channel: document.getElementById('game_announce_channel').value || 'dm',
      reset_progress: document.getElementById('game_reset_progress').checked
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

  // --- SYSTÈME DE TICKETS ---

  // Live Preview Bindings for Ticket Panel
  ['ticket_panel_title', 'ticket_panel_desc', 'ticket_panel_color', 'ticket_panel_selector', 'ticket_panel_thumbnail', 'ticket_panel_image_url'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const eventName = el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, () => {
        const panel = {
          title: document.getElementById('ticket_panel_title').value,
          description: document.getElementById('ticket_panel_desc').value,
          color: document.getElementById('ticket_panel_color').value,
          selector_type: document.getElementById('ticket_panel_selector').value,
          thumbnail: document.getElementById('ticket_panel_thumbnail').checked,
          image_url: document.getElementById('ticket_panel_image_url').value
        };
        fetch('/api/config/tickets')
          .then(res => res.json())
          .then(data => {
            updateTicketPreview(panel, data.options);
          }).catch(() => {
            updateTicketPreview(panel, []);
          });
      });
    }
  });

  // Ticket Panel Submit
  formTicketPanel.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('ticket_panel_title').value,
      description: document.getElementById('ticket_panel_desc').value,
      color: document.getElementById('ticket_panel_color').value,
      selector_type: document.getElementById('ticket_panel_selector').value,
      channel_id: document.getElementById('ticket_panel_channel').value,
      thumbnail: document.getElementById('ticket_panel_thumbnail').checked,
      image_url: document.getElementById('ticket_panel_image_url').value
    };

    fetch('/api/config/tickets/panel', {
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
          showToast('Panel de tickets enregistré et déployé !');
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
      image_url: document.getElementById('ticket_opt_image_url').value || null
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
        ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users'].forEach(selId => {
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
      ['ticket_opt_style', 'ticket_opt_category', 'ticket_opt_view_role', 'ticket_opt_support_roles', 'ticket_opt_ping_users'].forEach(selId => {
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
      saveConfig('/api/config/permissions', { admin_role_id, modo_role_id });
    });
  }

  // 3. Quarantaine
  formQuarantine.addEventListener('submit', (e) => {
    e.preventDefault();
    const role_id = document.getElementById('quarantine_role').value;
    const channel_id = document.getElementById('quarantine_channel').value;
    saveConfig('/api/config/quarantine', { role_id, channel_id });
  });

  // 4. Logs
  formLogs.addEventListener('submit', (e) => {
    e.preventDefault();
    const categories = ['messages', 'members', 'voice', 'moderation', 'structure', 'bots', 'confessions'];
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
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
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

  formAddShopItem.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      item_name: document.getElementById('shop_item_name').value,
      price: parseInt(document.getElementById('shop_item_price').value),
      description: document.getElementById('shop_item_desc').value,
      role_id: document.getElementById('shop_item_role').value || null
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
      
      const roleName = item.role_id ? (rolesList.find(r => r.id === item.role_id)?.name || `<@&${item.role_id}>`) : 'Aucun';
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
        <td><strong>${item.item_name}</strong></td>
        <td>${priceHTML}</td>
        <td>${item.description || '—'}</td>
        <td><span class="role-badge">${roleName}</span></td>
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
    toast.textContent = message;
    if (isError) {
      toast.style.borderColor = 'var(--danger-color)';
      toast.style.color = 'var(--danger-color)';
      toast.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.2)';
    } else {
      toast.style.borderColor = 'var(--success-color)';
      toast.style.color = 'var(--success-color)';
      toast.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.2)';
    }
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }

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
      } else if (type === 'select') {
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
            <span>Sélectionnez un rôle... (${autoroleButtonsList.length} options)</span>
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

    // Gestion du message existant
    if (existingMsgId) {
      embedCard.style.display = 'none';
      let banner = document.getElementById('autorole-preview-existing-banner');
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
      banner.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Les contrôles seront ajoutés directement sur le message Discord existant <strong>${existingMsgId}</strong>.`;
      banner.style.display = 'block';
    } else {
      embedCard.style.display = 'block';
      const banner = document.getElementById('autorole-preview-existing-banner');
      if (banner) banner.style.display = 'none';
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
            <button class="btn btn-delete btn-sm" style="padding: 4px 8px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i> Supprimer</button>
          </div>
          <p style="margin: 2px 0; font-size: 0.85rem; color: #b9bbbe;">
            <i class="fa-solid fa-hashtag"></i> Salon: <strong>${channelName}</strong> · ID Message: <code>${item.message_id}</code>
          </p>
          <p style="margin: 2px 0; font-size: 0.85rem; color: #8e9297; font-style: italic;">"${item.description || ''}"</p>
          <div style="margin-top: 5px; display: flex; flex-wrap: wrap; gap: 5px;">
            ${buttonsHtml}
          </div>
        `;

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

  // --- RENDERS POUR COUNTING ---

  function renderCountingChannels(list) {
    const container = document.getElementById('counting-channels-list-tbody');
    container.innerHTML = '';
    if (list.length === 0) {
      container.innerHTML = '<tr><td colspan="7" style="color: #8e9297; text-align: center; font-style: italic; padding: 15px;">Aucun salon de comptage configuré.</td></tr>';
      return;
    }
    list.forEach(item => {
      const channelName = getChannelName(item.channel_id);
      const tr = document.createElement('tr');
      
      const modeLabel = item.mode === 'math' ? 'Mathématique' : (item.mode === 'reverse' ? 'Inversé' : 'Normal');

      tr.innerHTML = `
        <td style="font-weight: 600;"><i class="fa-solid fa-hashtag" style="color: #7289da;"></i> ${channelName}</td>
        <td><span class="badge" style="background: rgba(114, 137, 218, 0.2); color: #7289da; padding: 4px 8px; border-radius: 4px;">${modeLabel}</span></td>
        <td style="font-weight: bold; color: #fff;">${item.current_number}</td>
        <td>${item.start_number}</td>
        <td style="font-weight: bold; color: #2ecc71;">${item.high_score}</td>
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

  initializeSearchableSelects();
});
