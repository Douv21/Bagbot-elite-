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

  // Lists
  const shopItemsList = document.getElementById('shop-items-list');
  const levelRewardsList = document.getElementById('level-rewards-list');
  const confessionsList = document.getElementById('confessions-list');

  // State
  let confessionsListState = [];
  let guildsList = [];
  let currentUser = null;
  let channelsList = [];
  let rolesList = [];

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
      
      if (tabId === 'tab-gifs') {
        fetchAndRenderGifs();
      }
    });
  });

  // Verify auth state
  fetch('/api/user')
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

    fetch('/api/guilds')
      .then(res => res.json())
      .then(guilds => {
        guildsList = guilds;
        guilds.forEach(guild => {
          const option = document.createElement('option');
          option.value = guild.id;
          option.textContent = guild.name;
          guildSelect.appendChild(option);
        });
        return fetch('/api/selected-guild');
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

  // Guild selection
  guildSelect.addEventListener('change', () => {
    const guildId = guildSelect.value;
    if (!guildId) {
      noGuildSelected.style.display = 'block';
      configForms.style.display = 'none';
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

  async function handleGuildSelection(guildId) {
    noGuildSelected.style.display = 'none';
    configForms.style.display = 'block';

    // 1. Fetch channels & roles
    await Promise.all([
      fetch('/api/channels').then(res => res.json()).then(data => { channelsList = data; }),
      fetch('/api/roles').then(res => res.json()).then(data => { rolesList = data; })
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
      // Clear all options except first (Désactivé)
      select.innerHTML = '<option value="">Désactivé</option>';
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

    // Synchroniser tous les sélecteurs de recherche personnalisés
    document.querySelectorAll('.channel-select, .announce-channel-select, .role-select').forEach(select => {
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
        document.getElementById('karma_min').value = lvl.karma_min ?? 1;
        document.getElementById('karma_max').value = lvl.karma_max ?? 3;
        document.getElementById('money_min').value = lvl.money_min ?? 2;
        document.getElementById('money_max').value = lvl.money_max ?? 5;
        document.getElementById('nsfw_xp_reward').value = lvl.nsfw_xp_reward ?? 0;
        document.getElementById('nsfw_money_reward').value = lvl.nsfw_money_reward ?? 0;
        document.getElementById('announce_channel').value = lvl.announce_channel || 'current';
        document.getElementById('announce_msg').value = lvl.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !';

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
          showToast('Avatar du bot mis à jour avec succès !');
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
            showToast('Avatar du bot mis à jour avec succès !');
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

  function initializeSearchableSelects() {
    const selectors = ['.role-select', '.channel-select', '.announce-channel-select'];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(select => {
        makeSelectSearchable(select);
      });
    });
  }

  initializeSearchableSelects();
});
