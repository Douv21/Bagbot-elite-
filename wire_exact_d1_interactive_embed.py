import re

# 1. Read D1 CSS for interactive embed
with open('public/style.css', 'r', encoding='utf-8') as f:
    d1_css = f.read()

# Extract lines from .discord-preview-container to end of embed styles
m_css = re.search(r'/\* Discord Preview Container \*/[\s\S]*?/\* Upload style elements \*/[\s\S]*?\.btn-upload-label:hover \{[\s\S]*?\}', d1_css)
embed_css_chunk = m_css.group(0) if m_css else ""

with open('public2/style.css', 'r', encoding='utf-8') as f:
    d2_css = f.read()

d2_css += "\n\n/* EXACT DASHBOARD 1 INTERACTIVE EMBED CSS STYLES */\n" + embed_css_chunk

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(d2_css)

print("public2/style.css updated with exact D1 interactive embed CSS!")

# 2. Update public2/app.js to handle all interactive clicks, mode toggling, color picking, and saving
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

d1_interactive_embed_js = """
// ─── DASHBOARD 1 INTERACTIVE DISCORD EMBED ENGINE FOR DASHBOARD 2 ───────────────
let d1EmbedMode = 'welcome';

function initD1InteractiveEmbed() {
  const modeSelect = document.getElementById('edit-mode-select');
  const colorPicker = document.getElementById('embed-color-picker');
  const leftBar = document.getElementById('discord-left-bar');
  const botAvatarBtn = document.getElementById('btn-change-bot-avatar');
  const botAvatarWrap = document.getElementById('bot-avatar-wrapper');
  const botAvatarInput = document.getElementById('bot-avatar-url-input');
  const botAvatarImg = document.getElementById('bot-avatar-preview');
  const authorNameInput = document.getElementById('embed-author-name-input');
  const authorIconWrap = document.getElementById('author-icon-wrapper');
  const authorIconInput = document.getElementById('embed-author-icon-input');
  const authorIconImg = document.getElementById('embed-author-icon-img');
  const imageBox = document.getElementById('discord-image-box');
  const imageWrapper = document.getElementById('image-url-wrapper');
  const imageOverlay = document.getElementById('discord-image-overlay');
  const imageInput = document.getElementById('embed-image-input');
  const imageImg = document.getElementById('discord-image-img');
  const formWL = document.getElementById('form-welcome-leave');

  if (modeSelect) {
    modeSelect.addEventListener('change', (e) => {
      d1EmbedMode = e.target.value;
      const isWelcome = d1EmbedMode === 'welcome';
      const roleFilterGroup = document.getElementById('welcome-role-filter-group');
      if (roleFilterGroup) roleFilterGroup.style.display = isWelcome ? 'block' : 'none';
      loadD1EmbedModeData();
    });
  }

  if (colorPicker && leftBar) {
    colorPicker.addEventListener('input', (e) => {
      leftBar.style.backgroundColor = e.target.value;
    });
  }

  if (botAvatarBtn && botAvatarWrap) {
    botAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      botAvatarWrap.style.display = botAvatarWrap.style.display === 'none' ? 'flex' : 'none';
    });
  }

  if (botAvatarInput && botAvatarImg) {
    botAvatarInput.addEventListener('input', (e) => {
      if (e.target.value) botAvatarImg.src = e.target.value;
    });
  }

  if (authorNameInput && authorIconWrap) {
    authorNameInput.addEventListener('focus', () => {
      authorIconWrap.style.display = 'flex';
    });
  }

  if (authorIconInput && authorIconImg) {
    authorIconInput.addEventListener('input', (e) => {
      if (e.target.value) {
        authorIconImg.src = e.target.value;
        authorIconImg.style.display = 'inline-block';
      } else {
        authorIconImg.style.display = 'none';
      }
    });
  }

  if (imageBox && imageWrapper) {
    imageBox.addEventListener('click', (e) => {
      if (e.target.tagName !== 'INPUT' && !e.target.classList.contains('btn-upload-label')) {
        imageWrapper.style.display = imageWrapper.style.display === 'none' ? 'flex' : 'none';
        if (imageOverlay) imageOverlay.style.display = imageWrapper.style.display === 'none' ? 'flex' : 'none';
      }
    });
  }

  if (imageInput && imageImg) {
    imageInput.addEventListener('input', (e) => {
      if (e.target.value) {
        imageImg.src = e.target.value;
        imageImg.style.display = 'block';
        if (imageOverlay) imageOverlay.style.display = 'none';
      } else {
        imageImg.style.display = 'none';
        if (imageOverlay && imageWrapper.style.display === 'none') imageOverlay.style.display = 'flex';
      }
    });
  }

  if (formWL) {
    formWL.addEventListener('submit', async (e) => {
      e.preventDefault();
      saveD1InteractiveEmbed();
    });
  }
}

function loadD1EmbedModeData() {
  const wl = state.config.welcome_leave || {};
  const isWelcome = d1EmbedMode === 'welcome';

  const chanSelect = document.getElementById('target-channel-select');
  const roleSelect = document.getElementById('welcome-role-filter-select');
  const colorPicker = document.getElementById('embed-color-picker');
  const leftBar = document.getElementById('discord-left-bar');
  const authorName = document.getElementById('embed-author-name-input');
  const authorIcon = document.getElementById('embed-author-icon-input');
  const authorIconImg = document.getElementById('embed-author-icon-img');
  const titleInput = document.getElementById('embed-title-input');
  const descField = document.getElementById('embed-desc-field');
  const imageInput = document.getElementById('embed-image-input');
  const imageImg = document.getElementById('discord-image-img');
  const imageOverlay = document.getElementById('discord-image-overlay');
  const footerInput = document.getElementById('embed-footer-input');

  if (chanSelect) chanSelect.value = (isWelcome ? wl.welcome_channel : wl.leave_channel) || '';
  if (roleSelect) roleSelect.value = wl.welcome_role_filter || '';

  const colorVal = (isWelcome ? wl.welcome_color : wl.leave_color) || (isWelcome ? '#00FF00' : '#FF0000');
  if (colorPicker) colorPicker.value = colorVal;
  if (leftBar) leftBar.style.backgroundColor = colorVal;

  const aName = (isWelcome ? wl.welcome_author_name : wl.leave_author_name) || '';
  const aIcon = (isWelcome ? wl.welcome_author_icon : wl.leave_author_icon) || '';
  if (authorName) authorName.value = aName;
  if (authorIcon) authorIcon.value = aIcon;
  if (authorIconImg) {
    if (aIcon) { authorIconImg.src = aIcon; authorIconImg.style.display = 'inline-block'; }
    else { authorIconImg.style.display = 'none'; }
  }

  if (titleInput) titleInput.value = (isWelcome ? wl.welcome_title : wl.leave_title) || (isWelcome ? '👋 Bienvenue sur le serveur !' : '👋 Au revoir');
  if (descField) descField.value = (isWelcome ? wl.welcome_desc : wl.leave_desc) || (isWelcome ? 'Bienvenue {user} sur {server} !' : 'Au revoir {user} !');

  const imgVal = (isWelcome ? wl.welcome_image : wl.leave_image) || '';
  if (imageInput) imageInput.value = imgVal;
  if (imageImg) {
    if (imgVal) { imageImg.src = imgVal; imageImg.style.display = 'block'; if (imageOverlay) imageOverlay.style.display = 'none'; }
    else { imageImg.style.display = 'none'; if (imageOverlay) imageOverlay.style.display = 'flex'; }
  }

  if (footerInput) footerInput.value = (isWelcome ? wl.welcome_footer : wl.leave_footer) || '';
}

async function saveD1InteractiveEmbed() {
  const wl = state.config.welcome_leave || {};
  const isWelcome = d1EmbedMode === 'welcome';

  const chanVal = document.getElementById('target-channel-select') ? document.getElementById('target-channel-select').value : '';
  const roleVal = document.getElementById('welcome-role-filter-select') ? document.getElementById('welcome-role-filter-select').value : '';
  const colorVal = document.getElementById('embed-color-picker') ? document.getElementById('embed-color-picker').value : '';
  const aName = document.getElementById('embed-author-name-input') ? document.getElementById('embed-author-name-input').value : '';
  const aIcon = document.getElementById('embed-author-icon-input') ? document.getElementById('embed-author-icon-input').value : '';
  const titleVal = document.getElementById('embed-title-input') ? document.getElementById('embed-title-input').value : '';
  const descVal = document.getElementById('embed-desc-field') ? document.getElementById('embed-desc-field').value : '';
  const imgVal = document.getElementById('embed-image-input') ? document.getElementById('embed-image-input').value : '';
  const footVal = document.getElementById('embed-footer-input') ? document.getElementById('embed-footer-input').value : '';

  const payload = {
    welcome_channel: isWelcome ? chanVal : wl.welcome_channel,
    leave_channel: isWelcome ? wl.leave_channel : chanVal,
    welcome_role_filter: roleVal || wl.welcome_role_filter,
    welcome_title: isWelcome ? titleVal : wl.welcome_title,
    welcome_desc: isWelcome ? descVal : wl.welcome_desc,
    welcome_color: isWelcome ? colorVal : wl.welcome_color,
    welcome_author_name: isWelcome ? aName : wl.welcome_author_name,
    welcome_author_icon: isWelcome ? aIcon : wl.welcome_author_icon,
    welcome_image: isWelcome ? imgVal : wl.welcome_image,
    welcome_footer: isWelcome ? footVal : wl.welcome_footer,
    leave_title: isWelcome ? wl.leave_title : titleVal,
    leave_desc: isWelcome ? wl.leave_desc : descVal,
    leave_color: isWelcome ? wl.leave_color : colorVal,
    leave_author_name: isWelcome ? wl.leave_author_name : aName,
    leave_author_icon: isWelcome ? wl.leave_author_icon : aIcon,
    leave_image: isWelcome ? wl.leave_image : imgVal,
    leave_footer: isWelcome ? wl.leave_footer : footVal
  };

  try {
    const res = await api('/api/config/welcome-leave', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.success) {
      showToast('Configuration Embed enregistrée avec succès !');
      state.config.welcome_leave = payload;
    } else {
      showToast('Erreur: ' + (res.error || 'Sauvegarde échouée'), 'error');
    }
  } catch(e) {
    showToast('Erreur réseau lors de la sauvegarde', 'error');
  }
}
"""

# Replace the previous embed JS functions in app.js
old_js_match = re.search(r'// ─── WELCOME / LEAVE DISCORD EMBED LIVE PREVIEW ──────────────────────────────[\s\S]*?function updateEmbedPreview\(\) \{[\s\S]*?\n\}', app_js)
if old_js_match:
    app_js = app_js.replace(old_js_match.group(0), d1_interactive_embed_js)
else:
    app_js += "\n\n" + d1_interactive_embed_js

# Call initD1InteractiveEmbed and loadD1EmbedModeData in hydrateForms
hydrate_call = "\n  initD1InteractiveEmbed();\n  loadD1EmbedModeData();"
if 'initD1InteractiveEmbed();' not in app_js:
    app_js = app_js.replace('function hydrateForms() {', 'function hydrateForms() {' + hydrate_call)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with exact D1 interactive embed JS engine!")
