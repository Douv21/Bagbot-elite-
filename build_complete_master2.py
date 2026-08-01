import re
import os

print("Applying Master Fixes & Full Feature Set for Dashboard 2...")

# 1. Update public2/index.html with placeholders and all panels
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace welcome-leave thumbnail section with placeholder + img
old_wl_thumb = """                        <!-- Clickable Thumbnail Image Section -->
                        <div class="clickable-embed-element clickable-thumb-wrap" onclick="openEmbedModal('thumbnail')" title="Cliquez pour ajouter/modifier la Vignette (Thumbnail)">
                          <img id="wl-preview-thumb-img" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Thumbnail" class="discord-thumb-img">
                          <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>"""

new_wl_thumb = """                        <!-- Clickable Thumbnail Image Section -->
                        <div class="clickable-embed-element clickable-thumb-wrap" onclick="openEmbedModal('thumbnail')" title="Cliquez pour ajouter/modifier la Vignette (Thumbnail)">
                          <div id="wl-thumb-placeholder" class="thumb-placeholder-box">
                            <i class="fa-solid fa-camera" style="font-size:1.2rem;color:var(--gold3);"></i>
                            <span style="font-size:0.65rem;color:var(--text-muted);display:block;margin-top:2px;">Vignette</span>
                          </div>
                          <img id="wl-preview-thumb-img" src="" alt="Thumbnail" class="discord-thumb-img" style="display:none;">
                          <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>"""

html = html.replace(old_wl_thumb, new_wl_thumb)

# Replace boost thumbnail section with placeholder + img
old_bst_thumb = """                        <div class="clickable-embed-element clickable-thumb-wrap" onclick="openEmbedModal('bst-thumbnail')" title="Cliquez pour ajouter/modifier la Vignette (Thumbnail)">
                          <img id="bst-preview-thumb-img" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Thumbnail" class="discord-thumb-img">
                          <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>"""

new_bst_thumb = """                        <div class="clickable-embed-element clickable-thumb-wrap" onclick="openEmbedModal('bst-thumbnail')" title="Cliquez pour ajouter/modifier la Vignette (Thumbnail)">
                          <div id="bst-thumb-placeholder" class="thumb-placeholder-box">
                            <i class="fa-solid fa-camera" style="font-size:1.2rem;color:var(--gold3);"></i>
                            <span style="font-size:0.65rem;color:var(--text-muted);display:block;margin-top:2px;">Vignette</span>
                          </div>
                          <img id="bst-preview-thumb-img" src="" alt="Thumbnail" class="discord-thumb-img" style="display:none;">
                          <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>"""

html = html.replace(old_bst_thumb, new_bst_thumb)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with placeholders!")

# 2. Update public2/style.css with thumb-placeholder-box styling
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

placeholder_css = """
.thumb-placeholder-box {
  width: 80px;
  height: 80px;
  border: 1px dashed rgba(212,175,55,0.4);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.2);
  transition: all 0.2s;
}
.thumb-placeholder-box:hover {
  border-color: var(--gold2);
  background: rgba(212,175,55,0.1);
}
"""

if '.thumb-placeholder-box' not in css:
    css += "\n" + placeholder_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("public2/style.css updated!")

# 3. Update public2/app.js for updateEmbedPreview & updateBoostEmbedPreview
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Fix updateEmbedPreview in app.js
old_wl_preview_fn = """  // Thumbnail
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (pThumbImg) {
    if (thumb) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    else { pThumbImg.style.display = 'none'; }
  }"""

new_wl_preview_fn = """  // Thumbnail
  const pThumbPlaceholder = document.getElementById('wl-thumb-placeholder');
  const pThumbImg = document.getElementById('wl-preview-thumb-img');
  if (thumb) {
    if (pThumbImg) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'none';
  } else {
    if (pThumbImg) pThumbImg.style.display = 'none';
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'flex';
  }"""

app_js = app_js.replace(old_wl_preview_fn, new_wl_preview_fn)

# Fix updateBoostEmbedPreview in app.js
old_bst_preview_fn = """  const pThumbImg = document.getElementById('bst-preview-thumb-img');
  if (pThumbImg) {
    if (thumb) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    else { pThumbImg.style.display = 'none'; }
  }"""

new_bst_preview_fn = """  const pThumbPlaceholder = document.getElementById('bst-thumb-placeholder');
  const pThumbImg = document.getElementById('bst-preview-thumb-img');
  if (thumb) {
    if (pThumbImg) { pThumbImg.src = thumb; pThumbImg.style.display = 'block'; }
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'none';
  } else {
    if (pThumbImg) pThumbImg.style.display = 'none';
    if (pThumbPlaceholder) pThumbPlaceholder.style.display = 'flex';
  }"""

app_js = app_js.replace(old_bst_preview_fn, new_bst_preview_fn)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated!")
