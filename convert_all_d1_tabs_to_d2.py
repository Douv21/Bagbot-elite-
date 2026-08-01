import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    d1_html = f.read()

# Map Dashboard 1 tab IDs to Dashboard 2 panel IDs
TAB_MAP = {
    'welcome': 'welcome-leave',
    'boost': 'boost',
    'announcements': 'announcements',
    'embed-sender': 'embed-sender',
    'autoroles': 'autoroles-join',
    'reactionroles': 'autoroles-role',
    'autothread': 'autothread',
    'logs': 'logs',
    'quarantine': 'quarantine',
    'automod': 'automod',
    'bump': 'bump',
    'forums': 'forums',
    'cmd-permissions': 'permissions',
    'tribunal': 'tribunal',
    'leveling': 'leveling',
    'quests': 'quests',
    'karma': 'karma',
    'shop': 'shop',
    'star': 'star',
    'confessions': 'confessions',
    'counting': 'counting',
    'game': 'game',
    'action-verite': 'action-verite',
    'gifs': 'gifs',
    'tickets': 'tickets',
    'map': 'map',
    'assistant': 'assistant',
    'ai': 'ai'
}

# Find all tab blocks in d1_html
matches = list(re.finditer(r'<div id="tab-([^"]+)" class="tab-content[^"]*">', d1_html))

tab_chunks = {}
for i in range(len(matches)):
    start = matches[i].start()
    end = matches[i+1].start() if i + 1 < len(matches) else d1_html.find('</main>')
    tab_id = matches[i].group(1)
    chunk = d1_html[start:end]
    # Remove outer div opening tag and matching closing tag
    chunk = re.sub(r'^<div id="tab-[^"]+" class="tab-content[^"]*">', '', chunk.strip())
    if chunk.endswith('</div>'):
        chunk = chunk[:-6].strip()
    tab_chunks[tab_id] = chunk

print(f"Extracted {len(tab_chunks)} tab chunks from Dashboard 1.")

# Build public2/index.html incorporating all tab chunks styled nicely for Dashboard 2
page_header = """<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bagbot Elite — Dashboard Premium Noir & Or</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="bg-glow"></div>
<div class="toast-container" id="toastContainer"></div>
<div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleMobileSidebar(false)"></div>

<!-- ═══ 1. LOGIN PAGE ═══ -->
<div class="page active" id="page-login">
  <div class="login-card">
    <div class="login-bot-icon" id="loginBotIcon">
      <i class="fa-solid fa-robot icon-fallback"></i>
    </div>
    <h1 class="login-title" id="loginBotName">Bagbot Elite</h1>
    <p class="login-subtitle">Panneau de Configuration Ultra-Premium Noir & Or</p>
    <div class="login-divider"></div>
    <a href="/login" class="btn-discord">
      <i class="fa-brands fa-discord"></i>
      Connexion avec Discord
    </a>
  </div>
</div>

<!-- ═══ 2. GUILD SELECTION PAGE ═══ -->
<div class="page" id="page-guilds">
  <div class="guilds-header">
    <h1><i class="fa-solid fa-crown" style="color:var(--gold3);font-size:1.8rem;margin-right:12px;"></i>Sélectionner un serveur</h1>
    <p>Choisissez le serveur Discord que vous souhaitez configurer</p>
    <div class="guilds-user-info" id="guildsUserInfo" style="display:none;">
      <img id="guildsUserAvatar" src="" alt="">
      <span>Connecté en tant que <strong id="guildsUserName"></strong></span>
    </div>
  </div>
  <div class="guilds-grid" id="guildsGrid">
    <div class="loading-wrap"><div class="loading-spinner"></div><p>Chargement de vos serveurs...</p></div>
  </div>
  <button class="btn-logout-guild" onclick="window.location.href='/logout'">
    <i class="fa-solid fa-right-from-bracket"></i> Déconnexion
  </button>
</div>

<!-- ═══ 3. DASHBOARD MAIN PAGE ═══ -->
<div class="page" id="page-dashboard">

  <!-- HEADER -->
  <header class="dash-header">
    <button class="btn-toggle-sidebar" id="btnToggleSidebar" onclick="toggleMobileSidebar()">
      <i class="fa-solid fa-bars"></i> <span>Menu</span>
    </button>
    <div class="header-bot">
      <img id="headerBotAvatar" src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Bot">
      <span class="header-bot-name" id="headerBotName">Bagbot Elite</span>
    </div>
    <div class="header-divider"></div>
    <div class="header-guild">
      <div class="header-guild-icon" id="headerGuildIcon"></div>
      <span class="header-guild-name" id="headerGuildName">Serveur</span>
    </div>
    <div class="header-spacer"></div>
    <div class="header-user">
      <img id="headerUserAvatar" src="" alt="">
      <span class="header-user-name" id="headerUserName"></span>
    </div>
    <button class="btn-sm-gold" onclick="changeGuild()"><i class="fa-solid fa-shuffle"></i> Changer</button>
    <button class="btn-logout" onclick="window.location.href='/logout'"><i class="fa-solid fa-right-from-bracket"></i> Quitter</button>
  </header>

  <!-- CATEGORIES HUB (CARDS GRID) -->
  <div class="category-hub" id="categoryHub">
    <div class="category-hub-header">
      <h2><i class="fa-solid fa-layer-group" style="color:var(--gold3);margin-right:12px;"></i>Catégories de Configuration</h2>
      <p>Sélectionnez une catégorie pour accéder à ses modules de gestion</p>
    </div>
    <div class="category-cards-grid" id="categoryCardsGrid"></div>
  </div>

  <!-- CATEGORY WORKSPACE (LATERAL SIDEBAR + FORM CONTENT AREA) -->
  <div class="category-workspace" id="categoryWorkspace" style="display:none;">
    <div class="mobile-subcat-nav" id="mobileSubcatNav">
      <button type="button" class="mobile-menu-btn" onclick="toggleMobileSidebar()">
        <i class="fa-solid fa-bars"></i>
        <span id="mobileActiveSubcatName">Navigation</span>
      </button>
      <span class="mobile-active-cat-name" id="mobileActiveCatName">Catégorie</span>
    </div>
    <div class="dash-body">
      <!-- LATERAL SIDEBAR -->
      <aside class="dash-sidebar" id="dashSidebar"></aside>

      <!-- FORM CONTENT AREA -->
      <main class="dash-main" id="dashMain">
"""

page_footer = """
      </main>
    </div>
  </div>

</div>

<script src="script.js"></script>
<script src="app.js"></script>
</body>
</html>
"""

# Panels construction
panels_html = []

for d1_tab_id, panel_id in TAB_MAP.items():
    chunk = tab_chunks.get(d1_tab_id, '')
    if not chunk:
        continue
    
    panel_wrapper = f"""
        <!-- PANEL: {panel_id} (From tab-{d1_tab_id}) -->
        <div class="content-panel" id="panel-{panel_id}">
          {chunk}
        </div>
    """
    panels_html.append(panel_wrapper)

# Add UNO and Suites panels if not covered
uno_panel = """
        <!-- PANEL: uno -->
        <div class="content-panel" id="panel-uno">
          <div class="panel-header">
            <h2><i class="fa-solid fa-layer-group" style="color:var(--gold3);margin-right:10px;"></i>Jeu UNO Canvas <span class="badge badge-jeu">JEU</span></h2>
            <p>Jeu de cartes UNO multijoueur interactif avec rendu graphique HD.</p>
            <div class="panel-line"></div>
          </div>
          <form id="form-uno">
            <div class="config-card glass-card">
              <h3><i class="fa-solid fa-layer-group"></i> Configuration du UNO</h3>
              <div class="toggle-row">
                <div class="toggle-info"><strong>Jeu UNO Actif</strong><small>Autoriser les parties de UNO sur le serveur</small></div>
                <label class="toggle"><input type="checkbox" id="uno-is_active" name="is_active"><span class="toggle-slider"></span></label>
              </div>
              <div class="form-grid" style="margin-top:16px;">
                <div class="form-group">
                  <label><i class="fa-solid fa-hashtag"></i> Salon des parties</label>
                  <select id="uno-announce_channel" name="announce_channel" class="channel-select"></select>
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
panels_html.append(uno_panel)

suites_panel = """
        <!-- PANEL: suites -->
        <div class="content-panel" id="panel-suites">
          <div class="panel-header">
            <h2><i class="fa-solid fa-crown" style="color:var(--gold3);margin-right:10px;"></i>Suites Privées VIP <span class="badge badge-vip">VIP</span></h2>
            <p>Salons vocaux & textuels privés réservés aux membres VIP et acheteurs boutique.</p>
            <div class="panel-line"></div>
          </div>
          <form id="form-suites">
            <div class="config-card glass-card">
              <h3><i class="fa-solid fa-crown"></i> Configuration des Suites</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label><i class="fa-solid fa-folder"></i> Catégorie des suites</label>
                  <select id="suites-private_suite_category_id" name="privateSuiteCategoryId" class="category-select"></select>
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
panels_html.append(suites_panel)

full_html = page_header + "\n".join(panels_html) + page_footer

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print("public2/index.html generated with 100% OF DASHBOARD 1'S PANELS, CONTROLS, AND FORMS!")
