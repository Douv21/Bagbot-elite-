import re

# 1. Update public2/index.html
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Move dashSidebar out of categoryWorkspace to be a direct child of body
if '<aside class="dash-sidebar" id="dashSidebar"></aside>' in html:
    html = html.replace('<aside class="dash-sidebar" id="dashSidebar"></aside>', '')

# Insert dashSidebar right after sidebarOverlay at the top of body
if '<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileSidebar(false)"></div>' in html:
    html = html.replace(
        '<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileSidebar(false)"></div>',
        '<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileSidebar(false)"></div>\n<aside class="dash-sidebar" id="dashSidebar"></aside>'
    )

# Replace panel-welcome-leave with the complete Discord Embed Live Preview panel
welcome_leave_panel_html = """        <!-- 1. ARRIVÉES & DÉPARTS (DISCORD EMBED LIVE PREVIEW) -->
        <div class="content-panel" id="panel-welcome-leave">
          <div class="panel-header">
            <h2><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i>Arrivées & Départs (Embed Discord)</h2>
            <p>Configurez les messages automatiques de bienvenue et de départ avec aperçu Embed Discord en direct.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('welcome-leave', event)">
            
            <!-- Mode Switcher & Channels -->
            <div class="config-card">
              <h3><i class="fa-solid fa-sliders"></i> Salons & Mode d'Édition</h3>
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

            <!-- DISCORD EMBED LIVE PREVIEW CARD -->
            <div class="config-card discord-preview-card">
              <h3><i class="fa-brands fa-discord" style="color:#5865F2;"></i> Aperçu Embed Discord en Direct</h3>
              
              <div class="discord-message-box">
                <img id="wl-embed-bot-avatar" class="discord-bot-avatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
                <div class="discord-message-body">
                  <div class="discord-author-line">
                    <span class="discord-name">Bagbot Elite</span>
                    <span class="discord-bot-badge">BOT</span>
                    <span class="discord-time">Aujourd'hui à 16:00</span>
                  </div>

                  <!-- Discord Embed Card -->
                  <div class="discord-embed-card" id="wl-discord-embed-card">
                    <div class="discord-left-bar" id="wl-embed-bar-color" style="background:#00FF00;"></div>
                    <div class="discord-embed-inner">
                      
                      <!-- Title Input -->
                      <div class="form-group" style="margin-bottom:12px;">
                        <label><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
                        <input type="text" id="wl-active_title" placeholder="👋 Bienvenue sur le serveur !" oninput="updateEmbedPreview()">
                      </div>

                      <!-- Description Textarea -->
                      <div class="form-group" style="margin-bottom:12px;">
                        <label><i class="fa-solid fa-align-left"></i> Description de l'Embed</label>
                        <textarea id="wl-active_desc" rows="4" placeholder="Bienvenue {user} sur {server} !" oninput="updateEmbedPreview()"></textarea>
                        <p class="form-hint">Variables : {user}, {server}, {membercount}</p>
                      </div>

                      <!-- Color Picker -->
                      <div class="form-group" style="margin-bottom:12px;">
                        <label><i class="fa-solid fa-palette"></i> Couleur de la barre Embed</label>
                        <input type="color" id="wl-active_color" value="#00FF00" oninput="updateEmbedPreview()">
                      </div>

                    </div>
                  </div>

                </div>
              </div>

            </div>

            <!-- Hidden Inputs to submit correct values based on mode -->
            <input type="hidden" id="wl-welcome_title" name="welcome_title">
            <input type="hidden" id="wl-welcome_desc" name="welcome_desc">
            <input type="hidden" id="wl-welcome_color" name="welcome_color">
            <input type="hidden" id="wl-leave_title" name="leave_title">
            <input type="hidden" id="wl-leave_desc" name="leave_desc">
            <input type="hidden" id="wl-leave_color" name="leave_color">

            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Enregistrer les Embeds Bienvenue & Départ</button>
            </div>
          </form>
        </div>"""

# Replace panel-welcome-leave in html
html = re.sub(
    r'<!-- 1\. ARRIVÉES & DÉPARTS -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    welcome_leave_panel_html + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with body-level sidebar & Embed Discord preview!")
