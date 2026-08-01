import re

# 1. Update public2/index.html
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

click_to_edit_embed_html = """        <!-- 1. ARRIVÉES & DÉPARTS (EMBED DISCORD INTERACTIF AVEC ÉDITION PAR CLIC) -->
        <div class="content-panel" id="panel-welcome-leave">
          <div class="panel-header">
            <h2><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i>Arrivées & Départs (Édition par clic sur l'Embed)</h2>
            <p>Cliquez directement sur n'importe quelle partie de l'Embed Discord pour la modifier instantanément.</p>
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

            <!-- INTERACTIVE CLICK-TO-EDIT DISCORD EMBED CARD -->
            <div class="config-card discord-wysiwyg-card">
              <h3><i class="fa-brands fa-discord" style="color:#5865F2;"></i> Embed Discord Éditable par Clic <small style="color:var(--gold2);font-size:0.8rem;margin-left:10px;">(Cliquez sur les textes/images pour éditer)</small></h3>
              
              <div class="discord-message-box">
                
                <!-- Bot Avatar Container -->
                <div class="discord-avatar-wrap" title="Avatar du Bot">
                  <img id="wl-bot-avatar-img" class="discord-bot-avatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
                </div>

                <div class="discord-message-body">
                  <div class="discord-author-line">
                    <span class="discord-name">Bagbot Elite</span>
                    <span class="discord-bot-badge">BOT</span>
                    <span class="discord-time">Aujourd'hui à 16:10</span>
                  </div>

                  <!-- Real Discord Embed Card with Direct Inline Inputs -->
                  <div class="discord-embed-card" id="wl-discord-embed-card">
                    
                    <!-- Left Accent Color Bar (Clickable) -->
                    <div class="discord-left-bar" id="wl-embed-bar-color" title="Cliquez pour changer la couleur de bordure" onclick="document.getElementById('wl-active_color').click()">
                      <input type="color" id="wl-active_color" value="#00FF00" style="opacity:0;width:1px;height:1px;position:absolute;" onchange="updateEmbedPreview()">
                    </div>

                    <div class="discord-embed-content-wrap">
                      
                      <!-- Inline Author Input -->
                      <div class="discord-inline-author-row">
                        <i class="fa-solid fa-user-ninja" style="color:#72767d;font-size:0.8rem;"></i>
                        <input type="text" id="wl-active_author_name" class="discord-inline-input author-name-input" placeholder="Auteur : Cliquez pour ajouter un nom d'auteur..." oninput="updateEmbedPreview()">
                        <input type="text" id="wl-active_author_icon" class="discord-inline-input author-icon-input" placeholder="Icône Auteur (URL https://...)" oninput="updateEmbedPreview()">
                      </div>

                      <div class="discord-embed-middle-wrap">
                        <div class="discord-embed-main-text">
                          <!-- Inline Title Input -->
                          <div class="discord-inline-title-row">
                            <input type="text" id="wl-active_title" class="discord-inline-input title-input" placeholder="Titre : Cliquez pour ajouter un titre d'embed..." oninput="updateEmbedPreview()">
                          </div>
                          <!-- Inline Description Textarea -->
                          <div class="discord-inline-desc-row">
                            <textarea id="wl-active_desc" class="discord-inline-textarea desc-input" rows="3" placeholder="Description : Cliquez pour écrire votre message ({user}, {server}, {membercount})..." oninput="updateEmbedPreview()"></textarea>
                          </div>
                        </div>

                        <!-- Inline Thumbnail Input -->
                        <div class="discord-inline-thumb-row">
                          <input type="text" id="wl-active_thumbnail" class="discord-inline-input thumb-input" placeholder="🖼️ Vignette (URL image)" oninput="updateEmbedPreview()">
                        </div>
                      </div>

                      <!-- Inline Large Banner Image Input -->
                      <div class="discord-inline-banner-row">
                        <input type="text" id="wl-active_image" class="discord-inline-input banner-input" placeholder="🌄 Grande Bannière Image/GIF (URL https://...)" oninput="updateEmbedPreview()">
                      </div>

                      <!-- Inline Footer Input -->
                      <div class="discord-inline-footer-row">
                        <i class="fa-solid fa-shoe-prints" style="color:#72767d;font-size:0.75rem;"></i>
                        <input type="text" id="wl-active_footer" class="discord-inline-input footer-input" placeholder="Footer : Cliquez pour ajouter un texte de bas de page..." oninput="updateEmbedPreview()">
                        <span class="discord-footer-bullet">•</span>
                        <span class="discord-footer-time">Aujourd'hui à 16:10</span>
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
    r'<!-- 1\. ARRIVÉES & DÉPARTS \(VRAI EMBED DISCORD HD\) -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    click_to_edit_embed_html + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with CLICK-TO-EDIT DIRECT DISCORD EMBED!")
