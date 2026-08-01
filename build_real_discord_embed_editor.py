import re

# 1. Update src/dashboard2.js to handle ALL welcome/leave embed fields
with open('src/dashboard2.js', 'r', encoding='utf-8') as f:
    d2_code = f.read()

old_wl_route = """app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const { welcome_channel, welcome_title, welcome_desc, welcome_color, leave_channel, leave_title, leave_desc, leave_color, welcome_role_filter } = req.body || {};
    db.prepare('INSERT INTO welcome_leave (guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, leave_title, leave_desc, leave_color, welcome_role_filter) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel, welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color, leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color, welcome_role_filter=excluded.welcome_role_filter').run(g, welcome_channel||null, leave_channel||null, welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', leave_title||'', leave_desc||'', leave_color||'#FF0000', welcome_role_filter||null);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

new_wl_route = """app.post('/api/config/welcome-leave', (req, res) => {
  const g = getGuildId(req); if (!g) return res.status(400).json({ error: 'No guild' });
  try {
    const {
      welcome_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_thumbnail, welcome_image, welcome_footer, welcome_role_filter,
      leave_channel, leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_thumbnail, leave_image, leave_footer
    } = req.body || {};

    db.prepare(`INSERT INTO welcome_leave (
      guild_id, welcome_channel, leave_channel, welcome_title, welcome_desc, welcome_color, welcome_author_name, welcome_author_icon, welcome_thumbnail, welcome_image, welcome_footer, welcome_role_filter,
      leave_title, leave_desc, leave_color, leave_author_name, leave_author_icon, leave_thumbnail, leave_image, leave_footer
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(guild_id) DO UPDATE SET
      welcome_channel=excluded.welcome_channel, leave_channel=excluded.leave_channel,
      welcome_title=excluded.welcome_title, welcome_desc=excluded.welcome_desc, welcome_color=excluded.welcome_color,
      welcome_author_name=excluded.welcome_author_name, welcome_author_icon=excluded.welcome_author_icon,
      welcome_thumbnail=excluded.welcome_thumbnail, welcome_image=excluded.welcome_image, welcome_footer=excluded.welcome_footer, welcome_role_filter=excluded.welcome_role_filter,
      leave_title=excluded.leave_title, leave_desc=excluded.leave_desc, leave_color=excluded.leave_color,
      leave_author_name=excluded.leave_author_name, leave_author_icon=excluded.leave_author_icon,
      leave_thumbnail=excluded.leave_thumbnail, leave_image=excluded.leave_image, leave_footer=excluded.leave_footer`
    ).run(
      g, welcome_channel||null, leave_channel||null,
      welcome_title||'', welcome_desc||'', welcome_color||'#00FF00', welcome_author_name||'', welcome_author_icon||'', welcome_thumbnail||'', welcome_image||'', welcome_footer||'', welcome_role_filter||null,
      leave_title||'', leave_desc||'', leave_color||'#FF0000', leave_author_name||'', leave_author_icon||'', leave_thumbnail||'', leave_image||'', leave_footer||''
    );
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});"""

d2_code = d2_code.replace(old_wl_route, new_wl_route)

with open('src/dashboard2.js', 'w', encoding='utf-8') as f:
    f.write(d2_code)

print("src/dashboard2.js updated to save ALL embed fields (author, thumbnail, banner image, footer)!")

# 2. Update public2/index.html
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

real_discord_embed_html = """        <!-- 1. ARRIVÉES & DÉPARTS (VRAI EMBED DISCORD HD) -->
        <div class="content-panel" id="panel-welcome-leave">
          <div class="panel-header">
            <h2><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i>Arrivées & Départs (Embeds Discord complets)</h2>
            <p>Concevez de véritables Embeds Discord haute définition avec Auteur, Titre, Description, Vignette, Grande Bannière et Footer.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('welcome-leave', event)">
            
            <!-- Global Config & Mode Switcher -->
            <div class="config-card">
              <h3><i class="fa-solid fa-sliders"></i> Configuration & Mode d'Édition</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label><i class="fa-solid fa-pen-to-square"></i> Mode d'édition</label>
                  <select id="wl-edit_mode" onchange="switchWelcomeLeaveMode(this.value)">
                    <option value="welcome" selected>Message de Bienvenue (Arrivée)</option>
                    <option value="leave">Message de Départ (Départ)</option>
                  </select>
                </div>
                <div class="form-group" id="wl-welcome-chan-group">
                  <label><i class="fa-solid fa-hashtag"></i> Salon de bienvenue</label>
                  <select id="wl-welcome_channel" name="welcome_channel" data-type="channel"></select>
                </div>
                <div class="form-group" id="wl-leave-chan-group" style="display:none;">
                  <label><i class="fa-solid fa-hashtag"></i> Salon de départ</label>
                  <select id="wl-leave_channel" name="leave_channel" data-type="channel"></select>
                </div>
                <div class="form-group" id="wl-role-filter-group">
                  <label><i class="fa-solid fa-user-tag"></i> Rôle d'annonce d'arrivée (Optionnel)</label>
                  <select id="wl-welcome_role_filter" name="welcome_role_filter" data-type="role">
                    <option value="">— Immédiat (Tous les membres) —</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- VRAI EMBED DISCORD LIVE PREVIEW & EDITOR -->
            <div class="config-card discord-preview-card">
              <h3><i class="fa-brands fa-discord" style="color:#5865F2;"></i> Éditeur Embed Discord HD</h3>
              
              <div class="discord-message-box">
                <img id="wl-embed-bot-avatar" class="discord-bot-avatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
                <div class="discord-message-body">
                  <div class="discord-author-line">
                    <span class="discord-name">Bagbot Elite</span>
                    <span class="discord-bot-badge">BOT</span>
                    <span class="discord-time">Aujourd'hui à 16:05</span>
                  </div>

                  <!-- Discord Embed Container -->
                  <div class="discord-embed-card" id="wl-discord-embed-card">
                    <div class="discord-left-bar" id="wl-embed-bar-color" style="background:#00FF00;"></div>
                    <div class="discord-embed-content-wrap">
                      
                      <!-- EMBED AUTHOR HEADER -->
                      <div class="discord-embed-author" id="wl-preview-author-wrap">
                        <img id="wl-preview-author-icon" src="" alt="" class="discord-embed-author-icon" style="display:none;">
                        <span id="wl-preview-author-name" class="discord-embed-author-name"></span>
                      </div>

                      <div class="discord-embed-middle-wrap">
                        <div class="discord-embed-main-text">
                          <!-- EMBED TITLE -->
                          <div id="wl-preview-title" class="discord-embed-title">👋 Bienvenue</div>
                          <!-- EMBED DESCRIPTION -->
                          <div id="wl-preview-desc" class="discord-embed-desc">Bienvenue {user} sur {server} !</div>
                        </div>

                        <!-- EMBED THUMBNAIL (SMALL RIGHT IMAGE) -->
                        <div id="wl-preview-thumb-wrap" class="discord-embed-thumb" style="display:none;">
                          <img id="wl-preview-thumb-img" src="" alt="">
                        </div>
                      </div>

                      <!-- EMBED LARGE BANNER IMAGE -->
                      <div id="wl-preview-banner-wrap" class="discord-embed-banner" style="display:none;">
                        <img id="wl-preview-banner-img" src="" alt="">
                      </div>

                      <!-- EMBED FOOTER -->
                      <div class="discord-embed-footer" id="wl-preview-footer-wrap">
                        <span id="wl-preview-footer-text"></span>
                        <span class="discord-embed-footer-bullet">•</span>
                        <span>Aujourd'hui à 16:05</span>
                      </div>

                    </div>
                  </div>

                </div>
              </div>

              <!-- EMBED FORM CONTROLS -->
              <div class="embed-controls-grid" style="margin-top:20px;">
                <div class="form-group">
                  <label><i class="fa-solid fa-user-ninja"></i> Nom de l'Auteur</label>
                  <input type="text" id="wl-active_author_name" placeholder="Ex: Bagbot Elite / Nom du serveur" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-image"></i> Icône de l'Auteur (URL)</label>
                  <input type="text" id="wl-active_author_icon" placeholder="https://..." oninput="updateEmbedPreview()">
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
                  <input type="text" id="wl-active_title" placeholder="👋 Bienvenue sur le serveur !" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-palette"></i> Couleur de la barre</label>
                  <input type="color" id="wl-active_color" value="#00FF00" oninput="updateEmbedPreview()">
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                  <label><i class="fa-solid fa-align-left"></i> Description de l'Embed</label>
                  <textarea id="wl-active_desc" rows="4" placeholder="Bienvenue {user} sur {server} !" oninput="updateEmbedPreview()"></textarea>
                  <p class="form-hint">Variables : {user}, {server}, {membercount}</p>
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-file-image"></i> Vignette / Thumbnail (URL)</label>
                  <input type="text" id="wl-active_thumbnail" placeholder="https://... (Petite image en haut à droite)" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-panorama"></i> Grande Bannière / Image (URL)</label>
                  <input type="text" id="wl-active_image" placeholder="https://... (Grande image centrale)" oninput="updateEmbedPreview()">
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                  <label><i class="fa-solid fa-shoe-prints"></i> Texte du Footer</label>
                  <input type="text" id="wl-active_footer" placeholder="Ex: Bagbot Elite • Serveur Officiel" oninput="updateEmbedPreview()">
                </div>
              </div>

            </div>

            <!-- Hidden Inputs to submit correct values to SQLite based on mode -->
            <input type="hidden" id="wl-welcome_title" name="welcome_title">
            <input type="hidden" id="wl-welcome_desc" name="welcome_desc">
            <input type="hidden" id="wl-welcome_color" name="welcome_color">
            <input type="hidden" id="wl-welcome_author_name" name="welcome_author_name">
            <input type="hidden" id="wl-welcome_author_icon" name="welcome_author_icon">
            <input type="hidden" id="wl-welcome_thumbnail" name="welcome_thumbnail">
            <input type="hidden" id="wl-welcome_image" name="welcome_image">
            <input type="hidden" id="wl-welcome_footer" name="welcome_footer">

            <input type="hidden" id="wl-leave_title" name="leave_title">
            <input type="hidden" id="wl-leave_desc" name="leave_desc">
            <input type="hidden" id="wl-leave_color" name="leave_color">
            <input type="hidden" id="wl-leave_author_name" name="leave_author_name">
            <input type="hidden" id="wl-leave_author_icon" name="leave_author_icon">
            <input type="hidden" id="wl-leave_thumbnail" name="leave_thumbnail">
            <input type="hidden" id="wl-leave_image" name="leave_image">
            <input type="hidden" id="wl-leave_footer" name="leave_footer">

            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Enregistrer les Embeds Bienvenue & Départ</button>
            </div>
          </form>
        </div>"""

html = re.sub(
    r'<!-- 1\. ARRIVÉES & DÉPARTS \(DISCORD EMBED LIVE PREVIEW\) -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    real_discord_embed_html + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with REAL DISCORD EMBED EDITOR & LIVE PREVIEW CARD!")
