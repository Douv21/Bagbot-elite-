import re

# 1. Update public2/app.js
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

clickable_embed_js = """
// ─── DASHBOARD 2 STANDALONE CLICKABLE DISCORD EMBED ENGINE ────────────────────
let wlMode = 'welcome';
let activeModalType = '';

function switchWelcomeLeaveMode(mode) {
  wlMode = mode;
  const isWelcome = mode === 'welcome';
  const wGroup = document.getElementById('wl-welcome-chan-group');
  const lGroup = document.getElementById('wl-leave-chan-group');
  const rGroup = document.getElementById('wl-role-filter-group');
  if (wGroup) wGroup.style.display = isWelcome ? 'block' : 'none';
  if (lGroup) lGroup.style.display = isWelcome ? 'none' : 'block';
  if (rGroup) rGroup.style.display = isWelcome ? 'block' : 'none';

  updateEmbedPreview();
}

function updateEmbedPreview() {
  const wl = state.config.welcome_leave || {};
  const isWelcome = wlMode === 'welcome';

  const title = (isWelcome ? wl.welcome_title : wl.leave_title) || (isWelcome ? '👋 Bienvenue sur le serveur !' : '👋 Au revoir');
  const desc = (isWelcome ? wl.welcome_desc : wl.leave_desc) || (isWelcome ? 'Bienvenue {user} sur {server} !' : 'Au revoir {user} !');
  const color = (isWelcome ? wl.welcome_color : wl.leave_color) || (isWelcome ? '#00FF00' : '#FF0000');
  const aName = (isWelcome ? wl.welcome_author_name : wl.leave_author_name) || '';
  const aIcon = (isWelcome ? wl.welcome_author_icon : wl.leave_author_icon) || '';
  const thumb = (isWelcome ? wl.welcome_thumbnail : wl.leave_thumbnail) || '';
  const image = (isWelcome ? wl.welcome_image : wl.leave_image) || '';
  const footer = (isWelcome ? wl.welcome_footer : wl.leave_footer) || '';

  // Update Bot Avatar
  const botAvatarImg = document.getElementById('wl-bot-avatar-img');
  if (botAvatarImg && state.botInfo && state.botInfo.avatarURL) botAvatarImg.src = state.botInfo.avatarURL;

  // Update Left Bar Color
  const bar = document.getElementById('wl-embed-color-bar');
  if (bar) bar.style.background = color;

  // Update Author
  const pAuthorName = document.getElementById('wl-preview-author-name');
  const pAuthorIcon = document.getElementById('wl-preview-author-icon');
  if (pAuthorName) pAuthorName.textContent = aName || 'Cliquez pour ajouter un Auteur...';
  if (pAuthorIcon) {
    if (aIcon) { pAuthorIcon.src = aIcon; pAuthorIcon.style.display = 'block'; }
    else { pAuthorIcon.style.display = 'none'; }
  }

  // Update Title & Desc
  const pTitle = document.getElementById('wl-preview-title');
  if (pTitle) pTitle.textContent = title;

  const pDesc = document.getElementById('wl-preview-desc');
  if (pDesc) pDesc.textContent = desc;

  // Update Thumbnail
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (pThumbImg) {
    if (thumb) pThumbImg.src = thumb;
    else pThumbImg.src = 'https://cdn.discordapp.com/embed/avatars/0.png';
  }

  // Update Banner Image
  const pBannerPlaceholder = document.getElementById('wl-banner-placeholder');
  const pBannerImg = document.getElementById('wl-preview-banner-img');
  if (image) {
    if (pBannerImg) { pBannerImg.src = image; pBannerImg.style.display = 'block'; }
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'none';
  } else {
    if (pBannerImg) pBannerImg.style.display = 'none';
    if (pBannerPlaceholder) pBannerPlaceholder.style.display = 'flex';
  }

  // Update Footer
  const pFooterText = document.getElementById('wl-preview-footer-text');
  if (pFooterText) pFooterText.textContent = footer || 'Cliquez pour ajouter un Footer...';

  // Update Hidden Form Inputs
  setElVal('wl-welcome_title', wl.welcome_title || '👋 Bienvenue sur le serveur !');
  setElVal('wl-welcome_desc', wl.welcome_desc || 'Bienvenue {user} sur {server} !');
  setElVal('wl-welcome_color', wl.welcome_color || '#00FF00');
  setElVal('wl-welcome_author_name', wl.welcome_author_name || '');
  setElVal('wl-welcome_author_icon', wl.welcome_author_icon || '');
  setElVal('wl-welcome_thumbnail', wl.welcome_thumbnail || '');
  setElVal('wl-welcome_image', wl.welcome_image || '');
  setElVal('wl-welcome_footer', wl.welcome_footer || '');

  setElVal('wl-leave_title', wl.leave_title || '👋 Au revoir');
  setElVal('wl-leave_desc', wl.leave_desc || 'Au revoir {user} !');
  setElVal('wl-leave_color', wl.leave_color || '#FF0000');
  setElVal('wl-leave_author_name', wl.leave_author_name || '');
  setElVal('wl-leave_author_icon', wl.leave_author_icon || '');
  setElVal('wl-leave_thumbnail', wl.leave_thumbnail || '');
  setElVal('wl-leave_image', wl.leave_image || '');
  setElVal('wl-leave_footer', wl.leave_footer || '');
}

function openEmbedModal(type) {
  activeModalType = type;
  const wl = state.config.welcome_leave || {};
  const isWelcome = wlMode === 'welcome';
  const modal = document.getElementById('embedModalBackdrop');
  const titleEl = document.getElementById('embedModalTitle');
  const bodyEl = document.getElementById('embedModalBody');

  if (type === 'color') {
    const colorPicker = document.getElementById('wl-active_color');
    if (colorPicker) colorPicker.click();
    return;
  }

  let title = 'Modifier un Élément';
  let html = '';

  if (type === 'author') {
    title = '✏️ Modifier l\'Auteur de l\'Embed';
    const valName = (isWelcome ? wl.welcome_author_name : wl.leave_author_name) || '';
    const valIcon = (isWelcome ? wl.welcome_author_icon : wl.leave_author_icon) || '';
    html = `
      <div class="form-group mb-3">
        <label><i class="fa-solid fa-user-ninja"></i> Nom de l'Auteur</label>
        <input type="text" id="modal-author_name" class="custom-input" value="${valName}" placeholder="Ex: Bagbot Elite / Serveur Officiel">
      </div>
      <div class="form-group">
        <label><i class="fa-solid fa-image"></i> Icône de l'Auteur (URL https://...)</label>
        <input type="text" id="modal-author_icon" class="custom-input" value="${valIcon}" placeholder="https://cdn.discordapp.com/...">
      </div>
    `;
  } else if (type === 'title') {
    title = '✏️ Modifier le Titre de l\'Embed';
    const val = (isWelcome ? wl.welcome_title : wl.leave_title) || (isWelcome ? '👋 Bienvenue sur le serveur !' : '👋 Au revoir');
    html = `
      <div class="form-group">
        <label><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
        <input type="text" id="modal-title" class="custom-input" value="${val}" placeholder="Titre de votre message...">
      </div>
    `;
  } else if (type === 'desc') {
    title = '✏️ Modifier la Description de l\'Embed';
    const val = (isWelcome ? wl.welcome_desc : wl.leave_desc) || (isWelcome ? 'Bienvenue {user} sur {server} !' : 'Au revoir {user} !');
    html = `
      <div class="form-group">
        <label><i class="fa-solid fa-align-left"></i> Description de l'Embed</label>
        <textarea id="modal-desc" class="custom-input" rows="5" placeholder="Description de votre message...">${val}</textarea>
        <p class="form-hint">Variables : {user}, {server}, {membercount}</p>
      </div>
    `;
  } else if (type === 'thumbnail') {
    title = '🖼️ Modifier la Vignette (Thumbnail)';
    const val = (isWelcome ? wl.welcome_thumbnail : wl.leave_thumbnail) || '';
    html = `
      <div class="form-group">
        <label><i class="fa-solid fa-file-image"></i> Lien URL de la Vignette (Image carrée)</label>
        <input type="text" id="modal-thumbnail" class="custom-input" value="${val}" placeholder="https://cdn.discordapp.com/...">
        <p class="form-hint">Laissez vide pour masquer la vignette.</p>
      </div>
    `;
  } else if (type === 'image') {
    title = '🌄 Modifier la Grande Bannière Image / GIF';
    const val = (isWelcome ? wl.welcome_image : wl.leave_image) || '';
    html = `
      <div class="form-group">
        <label><i class="fa-solid fa-panorama"></i> Lien URL de la Bannière (Image / GIF)</label>
        <input type="text" id="modal-image" class="custom-input" value="${val}" placeholder="https://media.giphy.com/media/...">
        <p class="form-hint">Laissez vide pour masquer la bannière.</p>
      </div>
    `;
  } else if (type === 'footer') {
    title = '👟 Modifier le Footer (Bas de page)';
    const val = (isWelcome ? wl.welcome_footer : wl.leave_footer) || '';
    html = `
      <div class="form-group">
        <label><i class="fa-solid fa-shoe-prints"></i> Texte du Footer</label>
        <input type="text" id="modal-footer" class="custom-input" value="${val}" placeholder="Ex: Bagbot Elite • Serveur Officiel">
      </div>
    `;
  }

  if (titleEl) titleEl.innerHTML = title;
  if (bodyEl) bodyEl.innerHTML = html;
  if (modal) modal.classList.add('active');
}

function closeEmbedModal(e) {
  if (e && e.target !== document.getElementById('embedModalBackdrop') && !e.target.classList.contains('btn-secondary') && !e.target.closest('.btn-close-modal')) return;
  const modal = document.getElementById('embedModalBackdrop');
  if (modal) modal.classList.remove('active');
}

function applyEmbedModalChanges() {
  if (!state.config.welcome_leave) state.config.welcome_leave = {};
  const wl = state.config.welcome_leave;
  const isWelcome = wlMode === 'welcome';

  if (activeModalType === 'author') {
    const elName = document.getElementById('modal-author_name');
    const elIcon = document.getElementById('modal-author_icon');
    if (isWelcome) {
      wl.welcome_author_name = elName ? elName.value : '';
      wl.welcome_author_icon = elIcon ? elIcon.value : '';
    } else {
      wl.leave_author_name = elName ? elName.value : '';
      wl.leave_author_icon = elIcon ? elIcon.value : '';
    }
  } else if (activeModalType === 'title') {
    const el = document.getElementById('modal-title');
    if (isWelcome) wl.welcome_title = el ? el.value : '';
    else wl.leave_title = el ? el.value : '';
  } else if (activeModalType === 'desc') {
    const el = document.getElementById('modal-desc');
    if (isWelcome) wl.welcome_desc = el ? el.value : '';
    else wl.leave_desc = el ? el.value : '';
  } else if (activeModalType === 'thumbnail') {
    const el = document.getElementById('modal-thumbnail');
    if (isWelcome) wl.welcome_thumbnail = el ? el.value : '';
    else wl.leave_thumbnail = el ? el.value : '';
  } else if (activeModalType === 'image') {
    const el = document.getElementById('modal-image');
    if (isWelcome) wl.welcome_image = el ? el.value : '';
    else wl.leave_image = el ? el.value : '';
  } else if (activeModalType === 'footer') {
    const el = document.getElementById('modal-footer');
    if (isWelcome) wl.welcome_footer = el ? el.value : '';
    else wl.leave_footer = el ? el.value : '';
  }

  updateEmbedPreview();
  const modal = document.getElementById('embedModalBackdrop');
  if (modal) modal.classList.remove('active');
}
"""

if 'switchWelcomeLeaveMode' not in app_js:
    h_idx = app_js.find('function hydrateForms()')
    if h_idx != -1:
        app_js = app_js[:h_idx] + clickable_embed_js + "\n\n" + app_js[h_idx:]

if 'switchWelcomeLeaveMode(' not in app_js:
    app_js = app_js.replace("setElVal('wl-welcome_channel', wl.welcome_channel);", "setElVal('wl-welcome_channel', wl.welcome_channel);\n  switchWelcomeLeaveMode('welcome');")

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with standalone click-to-edit embed engine!")

# 2. Update public2/style.css for Discord Client Editor & Modal
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

clickable_embed_css = """
/* DISCORD CLIENT CLICKABLE EMBED EDITOR STYLING */
.discord-client-editor-card {
  background: #181920 !important;
  border: 1px solid #2f313a !important;
  padding: 24px !important;
}
.editor-badge-bar {
  margin-bottom: 16px;
}
.badge-gold {
  background: rgba(212,175,55,0.15);
  color: var(--gold2);
  border: 1px solid var(--gold);
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.discord-client-message {
  display: flex;
  gap: 16px;
  background: #2f3136;
  padding: 20px;
  border-radius: 12px;
}
.discord-client-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.discord-client-content {
  flex: 1;
  min-width: 0;
}
.discord-client-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.discord-bot-username {
  font-weight: 700;
  color: #ffffff;
  font-size: 0.95rem;
}
.discord-bot-tag {
  background: #5865f2;
  color: #ffffff;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.discord-client-date {
  font-size: 0.75rem;
  color: #72767d;
}

/* Discord Embed Box */
.discord-client-embed {
  display: flex;
  background: #2f3136;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35);
}
.discord-color-bar {
  width: 5px;
  background: #00ff00;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.25s;
}
.discord-color-bar:hover {
  width: 8px;
  filter: brightness(1.2);
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
}
.discord-embed-inner-body {
  padding: 16px;
  flex: 1;
  min-width: 0;
}

/* Clickable Elements */
.clickable-embed-element {
  position: relative;
  border: 1px dashed transparent;
  border-radius: 6px;
  padding: 4px 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.clickable-embed-element:hover {
  background: rgba(212,175,55,0.08);
  border-color: var(--gold);
}
.clickable-embed-element .click-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--gold3);
  font-size: 0.85rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.clickable-embed-element:hover .click-icon {
  opacity: 1;
}

.discord-author-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 8px;
}
.discord-author-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
}
.discord-embed-main-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.discord-embed-text-col {
  flex: 1;
  min-width: 0;
}
.discord-embed-title-text {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}
.discord-embed-desc-text {
  font-size: 0.9rem;
  color: #dcddde;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
}
.clickable-thumb-wrap {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  padding: 0;
  flex-shrink: 0;
}
.discord-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-hover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gold2);
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.2s;
}
.clickable-thumb-wrap:hover .image-hover-overlay,
.clickable-banner-wrap:hover .image-hover-overlay {
  opacity: 1;
}
.banner-placeholder-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 1px dashed rgba(212,175,55,0.3);
  border-radius: 6px;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.discord-banner-img {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
}
.clickable-footer-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  font-size: 0.78rem;
  color: #72767d;
}
.discord-footer-dot {
  font-size: 0.8rem;
}

/* NOIR & OR EMBED EDIT MODAL */
.embed-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  backdrop-filter: blur(8px);
  z-index: 15000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.embed-modal-backdrop.active {
  opacity: 1;
  pointer-events: all;
}
.embed-modal-content {
  width: 90%;
  max-width: 520px;
  background: #11111a !important;
  border: 1px solid var(--gold) !important;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.2);
}
.embed-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(212,175,55,0.2);
  padding-bottom: 12px;
}
.embed-modal-header h3 {
  font-family: "Cinzel", serif;
  color: var(--gold);
  font-size: 1.1rem;
  margin: 0;
}
.btn-close-modal {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  transition: color 0.2s;
}
.btn-close-modal:hover { color: var(--gold); }
.embed-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 16px;
}
"""

if 'discord-client-editor-card' not in css:
    css += "\n" + clickable_embed_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated with standalone clickable Discord Embed styling!")
