import re

with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# 1. Add UNO, Suites, Lovecalc into CATEGORIES in app.js
old_divertissement = """  divertissement: {
    label: 'DIVERTISSEMENT & JEUX',
    icon: 'fa-gamepad',
    desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, Action-Vérité, GIFs',
    items: [
      { id: 'tribunal', label: 'Tribunal Discord', icon: 'fa-gavel', badge: 'JEU' },
      { id: 'star', label: 'Star de la Semaine', icon: 'fa-star', badge: 'TOP' },
      { id: 'confessions', label: 'Confessions Anonymes', icon: 'fa-mask' },
      { id: 'counting', label: 'Salons de Comptage', icon: 'fa-calculator' },
      { id: 'game', label: 'Jeu Mot Caché', icon: 'fa-gamepad' },
      { id: 'action-verite', label: 'Action ou Vérité', icon: 'fa-dice', badge: '18+' },
      { id: 'gifs', label: "GIFs d'action", icon: 'fa-file-video', badge: 'NSFW' },
    ]
  },"""

new_divertissement = """  divertissement: {
    label: 'DIVERTISSEMENT & JEUX',
    icon: 'fa-gamepad',
    desc: 'Tribunal, Star de la Semaine, Confessions, Mot Caché, UNO, Action-Vérité, GIFs',
    items: [
      { id: 'tribunal', label: 'Tribunal Discord', icon: 'fa-gavel', badge: 'JEU' },
      { id: 'star', label: 'Star de la Semaine', icon: 'fa-star', badge: 'TOP' },
      { id: 'uno', label: 'Jeu UNO Canvas', icon: 'fa-layer-group', badge: 'JEU' },
      { id: 'confessions', label: 'Confessions Anonymes', icon: 'fa-mask' },
      { id: 'counting', label: 'Salons de Comptage', icon: 'fa-calculator' },
      { id: 'game', label: 'Jeu Mot Caché', icon: 'fa-gamepad' },
      { id: 'action-verite', label: 'Action ou Vérité', icon: 'fa-dice', badge: '18+' },
      { id: 'gifs', label: "GIFs d'action", icon: 'fa-file-video', badge: 'NSFW' },
    ]
  },"""

app_js = app_js.replace(old_divertissement, new_divertissement)

# Add UNO, Suites, Lovecalc to hydration
old_hydration_end = "  // Render lists"

new_hydration_additions = """  // UNO Config
  const uno = config.uno_config || {};
  setElCheck('uno-is_active', uno.is_active === 1);
  setElVal('uno-announce_channel', uno.announce_channel);
  setElVal('uno-win_xp', uno.win_xp ?? 100);
  setElVal('uno-win_money', uno.win_money ?? 500);

  // Suites Privées
  const shopCfg = config.shop_config || {};
  setElVal('suites-private_suite_category_id', shopCfg.privateSuiteCategoryId);
  setElVal('suites-suite_channel_prefix', shopCfg.suiteChannelPrefix || '👑┆suite-');
  setElVal('suites-suite_price', shopCfg.suitePrice ?? 15000);

  // Render lists"""

app_js = app_js.replace(old_hydration_end, new_hydration_additions)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

print("public2/app.js updated with UNO & Suites Privées hydration!")
