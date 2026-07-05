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

  // Interactive Welcome / Leave State
  let welcomeData = {
    channel_id: '',
    title: '👋 Bienvenue',
    desc: 'Bienvenue {user} sur le serveur !',
    color: '#00ff00',
    thumbnail: true,
    image_url: ''
  };
  let leaveData = {
    channel_id: '',
    title: '👋 Au revoir',
    desc: 'Au revoir {user} !',
    color: '#ff0000',
    thumbnail: true,
    image_url: ''
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
        welcomeData = {
          channel_id: wl.welcome_channel || '',
          title: wl.welcome_title || '👋 Bienvenue',
          desc: wl.welcome_desc || 'Bienvenue {user} sur le serveur !',
          color: wl.welcome_color || '#00ff00',
          thumbnail: wl.welcome_thumbnail !== undefined ? !!wl.welcome_thumbnail : true,
          image_url: wl.welcome_image || ''
        };
        leaveData = {
          channel_id: wl.leave_channel || '',
          title: wl.leave_title || '👋 Au revoir',
          desc: wl.leave_desc || 'Au revoir {user} !',
          color: wl.leave_color || '#ff0000',
          thumbnail: wl.leave_thumbnail !== undefined ? !!wl.leave_thumbnail : true,
          image_url: wl.leave_image || ''
        };
        updateInteractiveEditor();

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
      document.getElementById('embed-image-input').style.display = 'block';
    } else {
      document.getElementById('discord-image-img').style.display = 'none';
      document.getElementById('discord-image-overlay').style.display = 'flex';
      document.getElementById('embed-image-input').value = '';
      document.getElementById('embed-image-input').style.display = 'none';
    }
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

  document.getElementById('discord-thumbnail-box').addEventListener('click', () => {
    const mode = document.getElementById('edit-mode-select').value;
    const data = mode === 'welcome' ? welcomeData : leaveData;
    data.thumbnail = !data.thumbnail;
    updateInteractiveEditor();
  });

  document.getElementById('discord-image-box').addEventListener('click', (e) => {
    if (e.target.id === 'embed-image-input') return;
    const input = document.getElementById('embed-image-input');
    if (input.style.display === 'none') {
      input.style.display = 'block';
      input.focus();
    } else {
      if (!input.value) {
        input.style.display = 'none';
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

  document.getElementById('embed-image-input').addEventListener('blur', (e) => {
    if (!e.target.value) {
      e.target.style.display = 'none';
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

      leave_channel: leaveData.channel_id,
      leave_title: leaveData.title,
      leave_desc: leaveData.desc,
      leave_color: leaveData.color,
      leave_thumbnail: leaveData.thumbnail,
      leave_image: leaveData.image_url
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
        alert('Erreur lors de l\'ajout du GIF.');
      }
    })
    .catch(console.error);
  });
});
