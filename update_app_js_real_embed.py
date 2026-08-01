import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace the previous switchWelcomeLeaveMode & updateEmbedPreview
old_embed_code = re.search(r'// ─── WELCOME / LEAVE DISCORD EMBED LIVE PREVIEW ──────────────────────────────[\s\S]*?function updateEmbedPreview\(\) \{[\s\S]*?\n\}', app_js)

new_embed_code = """// ─── WELCOME / LEAVE DISCORD EMBED LIVE PREVIEW ──────────────────────────────
let wlMode = 'welcome';

function switchWelcomeLeaveMode(mode) {
  wlMode = mode;
  const isWelcome = mode === 'welcome';
  const wGroup = document.getElementById('wl-welcome-chan-group');
  const lGroup = document.getElementById('wl-leave-chan-group');
  const rGroup = document.getElementById('wl-role-filter-group');
  if (wGroup) wGroup.style.display = isWelcome ? 'block' : 'none';
  if (lGroup) lGroup.style.display = isWelcome ? 'none' : 'block';
  if (rGroup) rGroup.style.display = isWelcome ? 'block' : 'none';

  const wl = state.config.welcome_leave || {};
  const elAuthorName = document.getElementById('wl-active_author_name');
  const elAuthorIcon = document.getElementById('wl-active_author_icon');
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');
  const elThumb = document.getElementById('wl-active_thumbnail');
  const elImage = document.getElementById('wl-active_image');
  const elFooter = document.getElementById('wl-active_footer');

  if (isWelcome) {
    if (elAuthorName) elAuthorName.value = wl.welcome_author_name || '';
    if (elAuthorIcon) elAuthorIcon.value = wl.welcome_author_icon || '';
    if (elTitle) elTitle.value = wl.welcome_title || '👋 Bienvenue';
    if (elDesc) elDesc.value = wl.welcome_desc || 'Bienvenue {user} sur {server} !';
    if (elColor) elColor.value = wl.welcome_color || '#00FF00';
    if (elThumb) elThumb.value = wl.welcome_thumbnail || '';
    if (elImage) elImage.value = wl.welcome_image || '';
    if (elFooter) elFooter.value = wl.welcome_footer || '';
  } else {
    if (elAuthorName) elAuthorName.value = wl.leave_author_name || '';
    if (elAuthorIcon) elAuthorIcon.value = wl.leave_author_icon || '';
    if (elTitle) elTitle.value = wl.leave_title || '👋 Au revoir';
    if (elDesc) elDesc.value = wl.leave_desc || 'Au revoir {user} !';
    if (elColor) elColor.value = wl.leave_color || '#FF0000';
    if (elThumb) elThumb.value = wl.leave_thumbnail || '';
    if (elImage) elImage.value = wl.leave_image || '';
    if (elFooter) elFooter.value = wl.leave_footer || '';
  }
  updateEmbedPreview();
}

function updateEmbedPreview() {
  const elAuthorName = document.getElementById('wl-active_author_name');
  const elAuthorIcon = document.getElementById('wl-active_author_icon');
  const elTitle = document.getElementById('wl-active_title');
  const elDesc = document.getElementById('wl-active_desc');
  const elColor = document.getElementById('wl-active_color');
  const elThumb = document.getElementById('wl-active_thumbnail');
  const elImage = document.getElementById('wl-active_image');
  const elFooter = document.getElementById('wl-active_footer');
  if (!elTitle || !elDesc || !elColor) return;

  const authorName = elAuthorName ? elAuthorName.value : '';
  const authorIcon = elAuthorIcon ? elAuthorIcon.value : '';
  const title = elTitle.value;
  const desc = elDesc.value;
  const color = elColor.value;
  const thumb = elThumb ? elThumb.value : '';
  const image = elImage ? elImage.value : '';
  const footer = elFooter ? elFooter.value : '';

  const bar = document.getElementById('wl-embed-bar-color');
  if (bar) bar.style.background = color;

  const pAuthorWrap = document.getElementById('wl-preview-author-wrap');
  const pAuthorName = document.getElementById('wl-preview-author-name');
  const pAuthorIcon = document.getElementById('wl-preview-author-icon');
  if (authorName || authorIcon) {
    if (pAuthorWrap) pAuthorWrap.style.display = 'flex';
    if (pAuthorName) pAuthorName.textContent = authorName;
    if (pAuthorIcon) {
      if (authorIcon) { pAuthorIcon.src = authorIcon; pAuthorIcon.style.display = 'block'; }
      else { pAuthorIcon.style.display = 'none'; }
    }
  } else {
    if (pAuthorWrap) pAuthorWrap.style.display = 'none';
  }

  const pTitle = document.getElementById('wl-preview-title');
  if (pTitle) pTitle.textContent = title || '👋 Bienvenue';

  const pDesc = document.getElementById('wl-preview-desc');
  if (pDesc) pDesc.textContent = desc || 'Message...';

  const pThumbWrap = document.getElementById('wl-preview-thumb-wrap');
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (thumb) {
    if (pThumbWrap) pThumbWrap.style.display = 'block';
    if (pThumbImg) pThumbImg.src = thumb;
  } else {
    if (pThumbWrap) pThumbWrap.style.display = 'none';
  }

  const pBannerWrap = document.getElementById('wl-preview-banner-wrap');
  const pBannerImg = document.getElementById('wl-preview-banner-img');
  if (image) {
    if (pBannerWrap) pBannerWrap.style.display = 'block';
    if (pBannerImg) pBannerImg.src = image;
  } else {
    if (pBannerWrap) pBannerWrap.style.display = 'none';
  }

  const pFooterWrap = document.getElementById('wl-preview-footer-wrap');
  const pFooterText = document.getElementById('wl-preview-footer-text');
  if (footer) {
    if (pFooterWrap) pFooterWrap.style.display = 'flex';
    if (pFooterText) pFooterText.textContent = footer;
  } else {
    if (pFooterWrap) pFooterWrap.style.display = 'none';
  }

  if (wlMode === 'welcome') {
    setElVal('wl-welcome_author_name', authorName);
    setElVal('wl-welcome_author_icon', authorIcon);
    setElVal('wl-welcome_title', title);
    setElVal('wl-welcome_desc', desc);
    setElVal('wl-welcome_color', color);
    setElVal('wl-welcome_thumbnail', thumb);
    setElVal('wl-welcome_image', image);
    setElVal('wl-welcome_footer', footer);
  } else {
    setElVal('wl-leave_author_name', authorName);
    setElVal('wl-leave_author_icon', authorIcon);
    setElVal('wl-leave_title', title);
    setElVal('wl-leave_desc', desc);
    setElVal('wl-leave_color', color);
    setElVal('wl-leave_thumbnail', thumb);
    setElVal('wl-leave_image', image);
    setElVal('wl-leave_footer', footer);
  }
}"""

if old_embed_code:
    app_js = app_js.replace(old_embed_code.group(0), new_embed_code)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with complete embed field preview logic!")

# Now update public2/style.css for Author, Thumbnail, Banner, and Footer styling
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

real_embed_css = """
/* DISCORD EMBED COMPLETE STYLING */
.discord-embed-content-wrap {
  padding: 16px;
  flex: 1;
}
.discord-embed-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.discord-embed-author-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
}
.discord-embed-author-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #ffffff;
}
.discord-embed-middle-wrap {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}
.discord-embed-main-text {
  flex: 1;
}
.discord-embed-title {
  font-size: 1rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}
.discord-embed-desc {
  font-size: 0.9rem;
  color: #dcddde;
  line-height: 1.4;
  white-space: pre-wrap;
}
.discord-embed-thumb {
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}
.discord-embed-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.discord-embed-banner {
  margin-top: 12px;
  border-radius: 6px;
  overflow: hidden;
  max-height: 280px;
}
.discord-embed-banner img {
  width: 100%;
  height: auto;
  max-height: 280px;
  object-fit: cover;
  display: block;
}
.discord-embed-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 0.75rem;
  color: #72767d;
}
.discord-embed-footer-bullet {
  font-size: 0.8rem;
}
.embed-controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
"""

css += "\n" + real_embed_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated with Author, Thumbnail, Banner, and Footer styling!")
