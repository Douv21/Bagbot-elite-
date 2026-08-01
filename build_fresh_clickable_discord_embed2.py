import re

# 1. Update public2/index.html with fresh clickable Discord Embed UI
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

fresh_clickable_embed_html = """        <!-- 1. ARRIVÉES & DÉPARTS (EMBED DISCORD INTERACTIF ET CLICABLE SUR MESURE FOR DASHBOARD 2) -->
        <div class="content-panel" id="panel-welcome-leave">
          <div class="panel-header">
            <h2><i class="fa-solid fa-door-open" style="color:var(--gold3);margin-right:10px;"></i>Éditeur d'Embed Discord Clicable (Bienvenue & Départ)</h2>
            <p>Cliquez directement sur l'Auteur, le Titre, la Description, la Vignette, la Bannière ou le Footer pour éditer chaque élément en temps réel.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('welcome-leave', event)">
            
            <!-- Category Controls Bar -->
            <div class="config-card">
              <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); align-items: end;">
                <div class="form-group">
                  <label><i class="fa-solid fa-sliders"></i> Mode à éditer</label>
                  <select id="wl-edit_mode" onchange="switchWelcomeLeaveMode(this.value)">
                    <option value="welcome" selected>📥 Message de Bienvenue (Arrivée)</option>
                    <option value="leave">📤 Message de Départ (Au revoir)</option>
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
                  <label><i class="fa-solid fa-user-tag"></i> Rôle d'annonce (Optionnel)</label>
                  <select id="wl-welcome_role_filter" name="welcome_role_filter" data-type="role">
                    <option value="">— Immédiat (Tous les membres) —</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- BRAND NEW CLICKABLE DISCORD EMBED EDITOR CARD -->
            <div class="config-card discord-client-editor-card">
              <div class="editor-badge-bar">
                <span class="badge-gold"><i class="fa-solid fa-hand-pointer"></i> Cliquez sur n'importe quel texte ou image de l'Embed ci-dessous pour modifier</span>
              </div>
              
              <div class="discord-client-message">
                <img id="wl-bot-avatar-img" class="discord-client-avatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
                
                <div class="discord-client-content">
                  <div class="discord-client-header">
                    <span class="discord-bot-username">Bagbot Elite</span>
                    <span class="discord-bot-tag">BOT</span>
                    <span class="discord-client-date">Aujourd'hui à 16:40</span>
                  </div>

                  <!-- Complete Clickable Discord Embed -->
                  <div class="discord-client-embed" id="wl-discord-embed-box">
                    
                    <!-- Color Bar Clicker -->
                    <div class="discord-color-bar" id="wl-embed-color-bar" title="Cliquez pour changer la couleur" onclick="openEmbedModal('color')">
                      <input type="color" id="wl-active_color" value="#00FF00" style="opacity:0;width:0;height:0;position:absolute;" onchange="updateEmbedPreview()">
                    </div>

                    <div class="discord-embed-inner-body">
                      
                      <!-- Clickable Author Section -->
                      <div class="clickable-embed-element clickable-author-wrap" onclick="openEmbedModal('author')" title="Cliquez pour modifier l'Auteur">
                        <img id="wl-preview-author-icon" src="" alt="" class="discord-author-icon" style="display:none;">
                        <span id="wl-preview-author-name" class="discord-author-text">Cliquez pour ajouter un Auteur...</span>
                        <i class="fa-solid fa-pen-to-square click-icon"></i>
                      </div>

                      <div class="discord-embed-main-row">
                        <div class="discord-embed-text-col">
                          <!-- Clickable Title Section -->
                          <div class="clickable-embed-element clickable-title-wrap" onclick="openEmbedModal('title')" title="Cliquez pour modifier le Titre">
                            <h4 id="wl-preview-title" class="discord-embed-title-text">👋 Bienvenue sur le serveur !</h4>
                            <i class="fa-solid fa-pen-to-square click-icon"></i>
                          </div>

                          <!-- Clickable Description Section -->
                          <div class="clickable-embed-element clickable-desc-wrap" onclick="openEmbedModal('desc')" title="Cliquez pour modifier la Description">
                            <div id="wl-preview-desc" class="discord-embed-desc-text">Bienvenue {user} sur {server} !</div>
                            <i class="fa-solid fa-pen-to-square click-icon"></i>
                          </div>
                        </div>

                        <!-- Clickable Thumbnail Image Section -->
                        <div class="clickable-embed-element clickable-thumb-wrap" onclick="openEmbedModal('thumbnail')" title="Cliquez pour ajouter/modifier la Vignette (Thumbnail)">
                          <img id="wl-preview-thumb-img" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Thumbnail" class="discord-thumb-img">
                          <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i></div>
                        </div>
                      </div>

                      <!-- Clickable Banner Image Section -->
                      <div class="clickable-embed-element clickable-banner-wrap" onclick="openEmbedModal('image')" title="Cliquez pour ajouter/modifier la Grande Bannière Image">
                        <div id="wl-banner-placeholder" class="banner-placeholder-box">
                          <i class="fa-solid fa-image" style="font-size:1.5rem;color:var(--gold3);margin-bottom:4px;"></i>
                          <span>Cliquez pour ajouter une grande bannière image/GIF</span>
                        </div>
                        <img id="wl-preview-banner-img" src="" alt="Bannière" class="discord-banner-img" style="display:none;">
                        <div class="image-hover-overlay"><i class="fa-solid fa-camera"></i> Bannière</div>
                      </div>

                      <!-- Clickable Footer Section -->
                      <div class="clickable-embed-element clickable-footer-wrap" onclick="openEmbedModal('footer')" title="Cliquez pour modifier le Footer">
                        <span id="wl-preview-footer-text" class="discord-footer-text">Cliquez pour ajouter un Footer...</span>
                        <span class="discord-footer-dot">•</span>
                        <span>Aujourd'hui à 16:40</span>
                        <i class="fa-solid fa-pen-to-square click-icon"></i>
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
        </div>

        <!-- LUXURY NOIR & OR EMBED EDIT MODAL -->
        <div class="embed-modal-backdrop" id="embedModalBackdrop" onclick="closeEmbedModal(event)">
          <div class="embed-modal-content card glass" onclick="event.stopPropagation()">
            <div class="embed-modal-header">
              <h3 id="embedModalTitle"><i class="fa-solid fa-pen-to-square"></i> Modifier l'Élément</h3>
              <button type="button" class="btn-close-modal" onclick="closeEmbedModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="embed-modal-body" id="embedModalBody">
              <!-- Dynamically filled by JS -->
            </div>
            <div class="embed-modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeEmbedModal()">Annuler</button>
              <button type="button" class="btn btn-primary" onclick="applyEmbedModalChanges()"><i class="fa-solid fa-check"></i> Valider</button>
            </div>
          </div>
        </div>"""

html = re.sub(
    r'<!-- 1\. ARRIVÉES & DÉPARTS \(EMBED DISCORD COMPLET HD\) -->[\s\S]*?<!-- 2\. REMERCIEMENTS BOOST -->',
    fresh_clickable_embed_html + '\n\n        <!-- 2. REMERCIEMENTS BOOST -->',
    html
)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with FRESH CLICKABLE DISCORD EMBED & MODAL!")
