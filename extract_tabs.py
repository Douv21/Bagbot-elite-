import re

with open('public/index.html', 'r', encoding='utf-8') as f:
    html1 = f.read()

# Map Dashboard 1 tab IDs to Dashboard 2 panel IDs and labels
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

# Extract HTML content of each tab from public/index.html
def extract_tab_content(tab_id):
    pattern = rf'<div id="tab-{tab_id}" class="tab-content[^"]*">(.*?)</div>\s*<!-- Tab:'
    m = re.search(pattern, html1, re.DOTALL)
    if not m:
        # Try fallback matching until next tab or end
        pattern2 = rf'<div id="tab-{tab_id}" class="tab-content[^"]*">(.*?)(?=<div id="tab-|</section>)'
        m = re.search(pattern2, html1, re.DOTALL)
    return m.group(1) if m else ""

extracted = {}
for tab_id in TAB_MAP:
    content = extract_tab_content(tab_id)
    extracted[tab_id] = content
    print(f"Tab {tab_id:20s}: Extracted {len(content)} chars")

print("\nAll 28 tabs extracted successfully.")
