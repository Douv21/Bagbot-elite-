import re

with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

uno_panel_html = """
        <!-- JEU UNO CANVAS -->
        <div class="content-panel" id="panel-uno">
          <div class="panel-header">
            <h2><i class="fa-solid fa-layer-group" style="color:var(--gold3);margin-right:10px;"></i>Jeu UNO Canvas <span class="badge badge-jeu">JEU</span></h2>
            <p>Jeu de cartes UNO multijoueur interactif avec rendu graphique HD.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('uno', event)">
            <div class="config-card">
              <h3><i class="fa-solid fa-layer-group"></i> Configuration du UNO</h3>
              <div class="toggle-row">
                <div class="toggle-info"><strong>Jeu UNO Actif</strong><small>Autoriser les parties de UNO sur le serveur</small></div>
                <label class="toggle"><input type="checkbox" id="uno-is_active" name="is_active"><span class="toggle-slider"></span></label>
              </div>
              <div class="form-grid" style="margin-top:16px;">
                <div class="form-group">
                  <label><i class="fa-solid fa-hashtag"></i> Salon des parties</label>
                  <select id="uno-announce_channel" name="announce_channel" data-type="channel"></select>
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-coins"></i> Pièces par victoire</label>
                  <input type="number" id="uno-win_money" name="win_money" value="500">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-star"></i> XP par victoire</label>
                  <input type="number" id="uno-win_xp" name="win_xp" value="100">
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
            </div>
          </form>
        </div>
"""

suites_panel_html = """
        <!-- SUITES PRIVÉES VIP -->
        <div class="content-panel" id="panel-suites">
          <div class="panel-header">
            <h2><i class="fa-solid fa-crown" style="color:var(--gold3);margin-right:10px;"></i>Suites Privées VIP <span class="badge badge-vip">VIP</span></h2>
            <p>Salons vocaux & textuels privés réservés aux membres VIP et acheteurs boutique.</p>
            <div class="panel-line"></div>
          </div>
          <form onsubmit="savePanelConfig('suites', event)">
            <div class="config-card">
              <h3><i class="fa-solid fa-crown"></i> Configuration des Suites</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label><i class="fa-solid fa-folder"></i> Catégorie des suites</label>
                  <select id="suites-private_suite_category_id" name="privateSuiteCategoryId" data-type="category"></select>
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-heading"></i> Préfixe des salons</label>
                  <input type="text" id="suites-suite_channel_prefix" name="suiteChannelPrefix" value="👑┆suite-">
                </div>
                <div class="form-group">
                  <label><i class="fa-solid fa-coins"></i> Prix d'achat en boutique</label>
                  <input type="number" id="suites-suite_price" name="suitePrice" value="15000">
                </div>
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button>
            </div>
          </form>
        </div>
"""

# Insert panel-uno before panel-confessions
if 'id="panel-confessions"' in html:
    html = html.replace('<div class="content-panel" id="panel-confessions">', uno_panel_html + '\n        <div class="content-panel" id="panel-confessions">')

# Insert panel-suites before panel-tribunal
if 'id="panel-tribunal"' in html:
    html = html.replace('<div class="content-panel" id="panel-tribunal">', suites_panel_html + '\n        <div class="content-panel" id="panel-tribunal">')

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("public2/index.html updated with UNO Canvas & Suites Privées VIP panels!")
