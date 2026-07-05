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

  // Lists
  const shopItemsList = document.getElementById('shop-items-list');
  const levelRewardsList = document.getElementById('level-rewards-list');

  // State
  let currentUser = null;
  let channelsList = [];
  let rolesList = [];

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

    // Load guilds list
    fetch('/api/guilds')
      .then(res => res.json())
      .then(guilds => {
        guilds.forEach(guild => {
          const option = document.createElement('option');
          option.value = guild.id;
          option.textContent = guild.name;
          guildSelect.appendChild(option);
        });

        // Load pre-selected guild from session if any
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
  }

  function loadGuildConfiguration() {
    fetch('/api/config')
      .then(res => res.json())
      .then(config => {
        // Welcome / Leave
        const wl = config.welcome_leave || {};
        document.getElementById('welcome_channel').value = wl.welcome_channel || '';
        document.getElementById('welcome_title').value = wl.welcome_title || '';
        document.getElementById('welcome_desc').value = wl.welcome_desc || '';
        document.getElementById('welcome_color').value = wl.welcome_color || '#00ff00';
        document.getElementById('welcome_thumbnail').checked = !!wl.welcome_thumbnail;

        document.getElementById('leave_channel').value = wl.leave_channel || '';
        document.getElementById('leave_title').value = wl.leave_title || '';
        document.getElementById('leave_desc').value = wl.leave_desc || '';
        document.getElementById('leave_color').value = wl.leave_color || '#ff0000';
        document.getElementById('leave_thumbnail').checked = !!wl.leave_thumbnail;

        // Confessions
        const conf = config.confession || {};
        document.getElementById('confessions_channel').value = conf.channel_id || '';

        // Quarantaine
        const quar = config.quarantine || {};
        document.getElementById('quarantine_role').value = quar.role_id || '';
        document.getElementById('quarantine_channel').value = quar.channel_id || '';

        // Logs
        const logs = config.logs || {};
        document.getElementById('logs_channel').value = logs.channel_id || '';
        document.getElementById('logs_events').value = logs.events || 'all';

        // Shop Items
        renderShopItems(config.shop || []);

        // Level Rewards
        renderLevelRewards(config.level_rewards || []);

        // Leveling Config
        const lvl = config.leveling_config || {};
        document.getElementById('xp_min').value = lvl.xp_min ?? 15;
        document.getElementById('xp_max').value = lvl.xp_max ?? 25;
        document.getElementById('announce_channel').value = lvl.announce_channel || 'current';
        document.getElementById('announce_msg').value = lvl.announce_msg || 'Bravo {user} ! Tu passes au niveau {level} !';
      })
      .catch(console.error);
  }

  // --- SUBMISSIONS ---

  // 1. Welcome / Leave
  formWelcomeLeave.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      welcome_channel: document.getElementById('welcome_channel').value,
      welcome_title: document.getElementById('welcome_title').value,
      welcome_desc: document.getElementById('welcome_desc').value,
      welcome_color: document.getElementById('welcome_color').value,
      welcome_thumbnail: document.getElementById('welcome_thumbnail').checked,

      leave_channel: document.getElementById('leave_channel').value,
      leave_title: document.getElementById('leave_title').value,
      leave_desc: document.getElementById('leave_desc').value,
      leave_color: document.getElementById('leave_color').value,
      leave_thumbnail: document.getElementById('leave_thumbnail').checked
    };

    saveConfig('/api/config/welcome-leave', data);
  });

  // 2. Confessions
  formConfessions.addEventListener('submit', (e) => {
    e.preventDefault();
    const channel_id = document.getElementById('confessions_channel').value;
    saveConfig('/api/config/confessions', { channel_id });
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
    const channel_id = document.getElementById('logs_channel').value;
    const events = document.getElementById('logs_events').value;
    saveConfig('/api/config/logs', { channel_id, events });
  });

  // 5. Leveling Settings
  formLevelingSettings.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = {
      xp_min: parseInt(document.getElementById('xp_min').value),
      xp_max: parseInt(document.getElementById('xp_max').value),
      announce_channel: document.getElementById('announce_channel').value,
      announce_msg: document.getElementById('announce_msg').value
    };
    saveConfig('/api/config/leveling', data);
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

      tr.innerHTML = `
        <td><strong>${item.item_name}</strong></td>
        <td>💰 ${item.price.toLocaleString('fr-FR')}</td>
        <td>${item.description || '—'}</td>
        <td><span class="role-badge">${roleName}</span></td>
        <td><button class="btn btn-danger btn-delete-shop" data-name="${item.item_name}"><i class="fa-solid fa-trash-can"></i> Supprimer</button></td>
      `;

      tr.querySelector('.btn-delete-shop').addEventListener('click', () => {
        deleteShopItem(item.item_name);
      });

      shopItemsList.appendChild(tr);
    });
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
});
