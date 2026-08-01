import re

# 1. Update index.html to add mobile-subcat-nav
with open('public2/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

mobile_nav_html = """  <!-- CATEGORY WORKSPACE (LATERAL SIDEBAR + FORM CONTENT AREA) -->
  <div class="category-workspace" id="categoryWorkspace" style="display:none;">
    <div class="mobile-subcat-nav" id="mobileSubcatNav">
      <button type="button" class="mobile-menu-btn" onclick="toggleMobileSidebar()">
        <i class="fa-solid fa-bars"></i>
        <span id="mobileActiveSubcatName">Sous-catégorie</span>
      </button>
      <span class="mobile-active-cat-name" id="mobileActiveCatName">Catégorie</span>
    </div>
    <div class="dash-body">"""

html = html.replace('<!-- CATEGORY WORKSPACE (LATERAL SIDEBAR + FORM CONTENT AREA) -->\n  <div class="category-workspace" id="categoryWorkspace" style="display:none;">\n    <div class="dash-body">', mobile_nav_html)

with open('public2/index.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update app.js to set mobile titles
with open('public2/app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

old_select_cat = "function selectCategory(catId) {"
new_select_cat = """function selectCategory(catId) {
  const mobileCat = document.getElementById('mobileActiveCatName');
  const catObj = CATEGORIES[catId];
  if (mobileCat && catObj) mobileCat.textContent = catObj.label;"""

app_js = app_js.replace(old_select_cat, new_select_cat)

old_show_panel = "function showPanel(panelId) {"
new_show_panel = """function showPanel(panelId) {
  const mobileSub = document.getElementById('mobileActiveSubcatName');
  const activeItem = document.querySelector(`.sidebar-item[data-panel="${panelId}"] span`);
  if (mobileSub && activeItem) mobileSub.textContent = activeItem.textContent;"""

app_js = app_js.replace(old_show_panel, new_show_panel)

with open('public2/app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# 3. Update style.css
with open('public2/style.css', 'r', encoding='utf-8') as f:
    css = f.read()

mobile_css = """
/* MOBILE SUB-CATEGORY NAVIGATION BAR */
.mobile-subcat-nav {
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #11111a;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 15px rgba(0,0,0,0.4);
}

.mobile-menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1));
  border: 1px solid var(--gold);
  color: var(--gold2);
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-family: "Outfit", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
}

.mobile-active-cat-name {
  font-family: "Cinzel", serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--gold3);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .mobile-subcat-nav { display: flex; }
  .btn-toggle-sidebar { display: none; }
  
  .dash-sidebar {
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    left: -330px !important;
    width: 310px !important;
    height: 100vh !important;
    z-index: 9999 !important;
    background: #0b0b14 !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    opacity: 1 !important;
    box-shadow: 10px 0 50px rgba(0,0,0,0.95);
    transition: left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-right: 2px solid var(--gold);
    overflow-y: auto;
  }
  
  .dash-sidebar.open {
    left: 0 !important;
  }
  
  .sidebar-overlay {
    z-index: 9998 !important;
  }
}
"""

css += "\n" + mobile_css

with open('public2/style.css', 'w', encoding='utf-8') as f:
    f.write(css)

print("Perfect mobile navigation and smartphone sidebar drawer applied!")
