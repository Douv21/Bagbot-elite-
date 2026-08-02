import re

# 1. Update public2/index.html
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

perfect_embed_panel_html = """        <!-- 1. ARRIVÉES & DÉPARTS (DISCORD EMBED PREVIEW HD) -->
        <div class="content-panel" id="panel-welcome-leave">
          <div class="panel-header">
            <h2><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i>Arrivées & Départs (Embed Discord)</h2>
            <p>Personnalisez vos messages d'accueil et de départ avec aperçu Embed Discord en direct.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('welcome-leave', event)">
            
            <!-- Global Options & Mode Switcher -->
            <div class="config-card">
              <h3><i class="fa-solid fa-sliders"></i> Mode & Salons d'envoi</h3>
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

            <!-- FORM CONTROLS CARD -->
            <div class="config-card">
              <h3><i class="fa-solid fa-wand-magic-sparkles"></i> Contenu de l'Embed</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label><i class="fa-solid fa-user-ninja"></i> Nom de l'Auteur</label>
                  <input type="text" id="wl-active_author_name" placeholder="Ex: Bagbot Elite / Nom du serveur" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-image"></i> Icône Auteur (Lien URL)</label>
                  <input type="text" id="wl-active_author_icon" placeholder="https://..." oninput="updateEmbedPreview()">
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-heading"></i> Titre de l'Embed</label>
                  <input type="text" id="wl-active_title" placeholder="👋 Bienvenue sur le serveur !" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-palette"></i> Couleur de la barre</label>
                  <input type="color" id="wl-active_color" value="#00FF00" style="padding:2px;height:42px;width:100%;" oninput="updateEmbedPreview()">
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                  <label><i class="fa-solid fa-align-left"></i> Description du message</label>
                  <textarea id="wl-active_desc" rows="4" placeholder="Bienvenue {user} sur {server} !" oninput="updateEmbedPreview()"></textarea>
                  <p class="form-hint">Variables : {user}, {server}, {membercount}</p>
                </div>

                <div class="form-group">
                  <label><i class="fa-solid fa-file-image"></i> Vignette / Thumbnail (Lien URL image)</label>
                  <input type="text" id="wl-active_thumbnail" placeholder="https://... (Petite image en haut à droite)" oninput="updateEmbedPreview()">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-panorama"></i> Grande Bannière / Image (Lien URL image)</label>
                  <input type="text" id="wl-active_image" placeholder="https://... (Grande image centrale)" oninput="updateEmbedPreview()">
                </div>

                <div class="form-group" style="grid-column:1/-1;">
                  <label><i class="fa-solid fa-shoe-prints"></i> Texte du Footer</label>
                  <input type="text" id="wl-active_footer" placeholder="Ex: Bagbot Elite • Serveur Officiel" oninput="updateEmbedPreview()">
                </div>
              </div>
            </div>

            <!-- AUTHENTIC DISCORD EMBED LIVE PREVIEW -->
            <div class="config-card discord-preview-card">
              <h3><i class="fa-brands fa-discord" style="color:#5865F2;"></i> Aperçu en Direct (Rendu Client Discord)</h3>
              
              <div class="discord-message-box">
                <img id="wl-embed-bot-avatar" class="discord-bot-avatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
                <div class="discord-message-body">
                  <div class="discord-author-line">
                    <span class="discord-name" id="wl-header-bot-name">Bagbot Elite</span>
                    <span class="discord-bot-badge">BOT</span>
                    <span class="discord-time">Aujourd'hui à 16:15</span>
                  </div>

                  <!-- Discord Embed Container -->
                  <div class="discord-embed-card" id="wl-discord-embed-card">
                    <div class="discord-left-bar" id="wl-embed-bar-color" style="background:#00FF00;"></div>
                    <div class="discord-embed-content-wrap">
                      
                      <!-- EMBED AUTHOR HEADER -->
                      <div class="discord-embed-author" id="wl-preview-author-wrap" style="display:none;">
                        <img id="wl-preview-author-icon" src="" alt="" class="discord-embed-author-icon" style="display:none;">
                        <span id="wl-preview-author-name" class="discord-embed-author-name"></span>
                      </div>

                      <div class="discord-embed-middle-wrap">
                        <div class="discord-embed-main-text">
                          <!-- EMBED TITLE -->
                          <div id="wl-preview-title" class="discord-embed-title">👋 Bienvenue sur le serveur !</div>
                          <!-- EMBED DESCRIPTION -->
                          <div id="wl-preview-desc" class="discord-embed-desc">Bienvenue {user} sur {server} !</div>
                        </div>

                        <!-- EMBED THUMBNAIL -->
                        <div id="wl-preview-thumb-wrap" class="discord-embed-thumb" style="display:none;">
                          <img id="wl-preview-thumb-img" src="" alt="">
                        </div>
                      </div>

                      <!-- EMBED LARGE BANNER IMAGE -->
                      <div id="wl-preview-banner-wrap" class="discord-embed-banner" style="display:none;">
                        <img id="wl-preview-banner-img" src="" alt="">
                      </div>

                      <!-- EMBED FOOTER -->
                      <div class="discord-embed-footer" id="wl-preview-footer-wrap" style="display:none;">
                        <span id="wl-preview-footer-text"></span>
                        <span class="discord-embed-footer-bullet">•</span>
                        <span>Aujourd'hui à 16:15</span>
                      </div>

                    </div>
                  </div>

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
    r'<!-- 1\. ARRIVÉES & DÉPARTS \(EMBED DISCORD INTERACTIF AVEC ÉDITION PAR CLIC\) -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    perfect_embed_panel_html + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with perfect Discord Embed preview panel!")
