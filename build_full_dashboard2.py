import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    html1 = f.read()

with open('public2/index.html', 'r', encoding='utf-8') as f:
    html2 = f.read()

# Map tab IDs from Dashboard 1 to Dashboard 2 panel IDs and icons/labels
TAB_MAP = {
    'welcome': ('panel-welcome-leave', 'Arrivées & Départs', 'fa-door-open'),
    'boost': ('panel-boost', 'Remerciements Boost', 'fa-rocket'),
    'announcements': ('panel-announcements', 'Annonces & Guides', 'fa-bullhorn'),
    'embed-sender': ('panel-embed-sender', 'Envoyeur d\'Embeds', 'fa-file-code'),
    'autoroles': ('panel-autoroles-join', 'Auto-Rôles à l\'Arrivée', 'fa-user-plus'),
    'reactionroles': ('panel-autoroles-role', 'Rôles Réaction', 'fa-rectangle-list'),
    'autothread': ('panel-autothread', 'Auto-Thread', 'fa-hashtag'),
    'logs': ('panel-logs', 'Logs d\'Activité', 'fa-scroll'),
    
    'quarantine': ('panel-quarantine', 'Quarantaine Anti-Raid', 'fa-shield-cat'),
    'automod': ('panel-automod', 'Auto-Modération', 'fa-user-shield'),
    'forums': ('panel-forums', 'Forums Illimités', 'fa-comments'),
    'cmd-permissions': ('panel-permissions', 'Commandes & Permissions', 'fa-terminal'),
    'tribunal': ('panel-tribunal', 'Tribunal Discord', 'fa-gavel'),
    
    'leveling': ('panel-leveling', 'Niveaux & XP', 'fa-arrow-trend-up'),
    'quests': ('panel-quests', 'Système de Quêtes', 'fa-scroll'),
    'karma': ('panel-karma', 'Configuration Karma', 'fa-star'),
    'shop': ('panel-shop', 'Boutique & Suites', 'fa-shop'),
    
    'confessions': ('panel-confessions', 'Confessions Anonymes', 'fa-mask'),
    'counting': ('panel-counting', 'Salons de Comptage', 'fa-calculator'),
    'game': ('panel-game', 'Jeu Mot Caché', 'fa-gamepad'),
    'action-verite': ('panel-action-verite', 'Action ou Vérité', 'fa-dice'),
    'bump': ('panel-bump', 'Rappels de Bump', 'fa-bell'),
    'gifs': ('panel-gifs', 'GIFs d\'action', 'fa-file-video'),
    
    'tickets': ('panel-tickets', 'Support & Tickets', 'fa-ticket'),
    'map': ('panel-map', 'Carte des Membres', 'fa-map-location-dot'),
    
    'assistant': ('panel-assistant', 'Assistant IA Admin', 'fa-robot'),
    'star': ('panel-star', 'Star de la Semaine', 'fa-star'),
    
    'ai': ('panel-ai', 'Clés & Modèles IA', 'fa-brain'),
}

# Function to adapt Dashboard 1 tab HTML into a Noir & Or luxury content panel
def convert_tab_to_panel(tab_id):
    panel_id, title, icon = TAB_MAP[tab_id]
    
    # Extract raw content
    pattern = rf'<div id="tab-{tab_id}" class="tab-content[^"]*">(.*?)</div>\s*<!-- Tab:'
    m = re.search(pattern, html1, re.DOTALL)
    if not m:
        pattern2 = rf'<div id="tab-{tab_id}" class="tab-content[^"]*">(.*?)(?=<div id="tab-|</section>)'
        m = re.search(pattern2, html1, re.DOTALL)
        content = m.group(1) if m else ""
    else:
        content = m.group(1)
    
    # Clean up inline styles that conflict with Noir & Or theme
    content = re.sub(r'style="background:\s*#111118;?"', 'class="config-card"', content)
    content = re.sub(r'class="card glass[^"]*"', 'class="config-card"', content)
    content = re.sub(r'class="card[^"]*"', 'class="config-card"', content)
    content = re.sub(r'class="btn btn-save[^"]*"', 'class="btn btn-primary"', content)
    
    # Build complete Noir & Or panel HTML
    panel_html = f'''      <!-- PANEL: {title} -->
      <div class="content-panel" id="{panel_id}">
        <div class="panel-header">
          <h2><i class="fa-solid {icon}" style="color:var(--gold3);margin-right:10px;"></i>{title}</h2>
          <p>Panneau de configuration de la fonctionnalité {title}.</p>
          <div class="panel-line"></div>
        </div>
{content.strip()}
      </div>
'''
    return panel_html

# Assemble all 28 panels
all_panels = []
for tab_id in TAB_MAP:
    all_panels.append(convert_tab_to_panel(tab_id))

panels_combined = "\n\n".join(all_panels)

# Replace the panel area inside public2/index.html
# Everything between <main class="dash-main" id="dashMain"> and </main>
main_start = html2.find('<main class="dash-main" id="dashMain">')
main_end = html2.find('</main>', main_start)

if main_start != -1 and main_end != -1:
    new_html2 = html2[:main_start + len('<main class="dash-main" id="dashMain">')] + "\n" + panels_combined + "\n    " + html2[main_end:]
    with open('public2/index.html', 'w', encoding='utf-8') as f:
        f.write(new_html2)
    print("public2/index.html updated with ALL 28 PANELS!")
else:
    print("ERROR finding main content area in public2/index.html")
