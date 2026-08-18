// category-nav.js
// Additive, standalone script for Dashboard 2's navigation flow. Owns four
// things, none of which script.js touches:
//
//   1. The full-page category hub (#category-hub) shown right after a guild
//      is selected, and the sidebar+config-forms view shown once a category
//      tile is picked — including the "back to hub" control.
//   2. The sidebar's collapse/expand rail toggle (desktop only).
//   3. The category tile selector (.category-tile[data-category]) — reused
//      as-is inside the hub — and showing/hiding the matching
//      .sidebar-category[data-category] feature list once inside a category.
//   4. Keeping all of the above in sync with script.js's own guild-selection
//      and tab-switching logic, without ever calling preventDefault /
//      stopPropagation on any event, so script.js's own listeners are never
//      interfered with. Where we need to react to something script.js does
//      (selecting a guild, resetting to the guild picker), we hook the same
//      DOM elements/events it uses and rely on normal event ordering
//      (script.js's own listeners are registered first and are either bound
//      directly on the target element or added before this file runs, so
//      they always execute before the delegated/added listeners below).
document.addEventListener('DOMContentLoaded', () => {
  const dashboardMain = document.querySelector('.dashboard-main');
  const noGuildSelected = document.getElementById('no-guild-selected');
  const categoryHub = document.getElementById('category-hub');
  const configForms = document.getElementById('config-forms');
  const serversGrid = document.getElementById('servers-grid');
  const guildSelectEl = document.getElementById('guild-select');
  const activeGuildTrigger = document.getElementById('active-guild-trigger');
  const btnChangeGuildBanner = document.getElementById('btn-change-guild-banner');
  const btnChangeGuildHub = document.getElementById('btn-change-guild-hub');
  const sidebarBackBtn = document.getElementById('sidebar-back-btn');
  const sidebarCollapseToggle = document.getElementById('sidebar-collapse-toggle');
  const mobileHamburger = document.getElementById('mobile-hamburger');
  const sidebarEl = document.querySelector('.sidebar');
  const sidebarOverlayEl = document.getElementById('sidebar-overlay');

  const selector = document.getElementById('category-selector');
  const categories = Array.from(document.querySelectorAll('.sidebar-category[data-category]'));
  const searchInput = document.getElementById('sidebar-tab-search');

  if (!noGuildSelected || !categoryHub || !configForms) return;
  if (!selector || !categories.length) return;

  const tiles = Array.from(selector.querySelectorAll('.category-tile[data-category]'));
  const HIDE_DELAY_MS = 240;

  let currentCategory = null;
  let searchActive = false;
  let hideTimers = new Map();

  // --- View state machine: 'no-guild' | 'hub' | 'category' -----------------
  // This is the only place that decides which of #no-guild-selected,
  // #category-hub and #config-forms is visible. script.js keeps flipping
  // #no-guild-selected / #config-forms between 'block' and 'none' on its own
  // (guild selection, "changer de serveur", ...) — every hook below reacts
  // to those same user actions and re-asserts the correct state right after,
  // in the same synchronous tick (before the browser paints), so there is no
  // visible flicker of the wrong panel.
  let viewState = 'no-guild';

  function setViewState(state) {
    viewState = state;

    if (state === 'no-guild') {
      noGuildSelected.style.display = 'block';
      categoryHub.style.display = 'none';
      configForms.style.display = 'none';
    } else if (state === 'hub') {
      noGuildSelected.style.display = 'none';
      categoryHub.style.display = 'block';
      configForms.style.display = 'none';
      syncHubGuildChip();
    } else if (state === 'category') {
      noGuildSelected.style.display = 'none';
      categoryHub.style.display = 'none';
      configForms.style.display = 'block';
    }

    if (dashboardMain) {
      dashboardMain.classList.toggle('category-active', state === 'category');
    }

    // The mobile hamburger only makes sense once the sidebar is actually in
    // play. Clearing the inline style (rather than forcing 'block') lets the
    // existing responsive CSS keep governing it normally (hidden on desktop,
    // inline-flex on mobile) once we're in the category view.
    if (mobileHamburger) {
      mobileHamburger.style.display = state === 'category' ? '' : 'none';
    }

    // Leaving the category view while the mobile drawer happens to be open
    // would otherwise leave a stray open sidebar floating over the hub.
    if (state !== 'category' && sidebarEl && sidebarEl.classList.contains('open')) {
      sidebarEl.classList.remove('open');
      if (sidebarOverlayEl) sidebarOverlayEl.classList.remove('open');
    }
  }

  // Mirrors the navbar's active-guild icon/initials/name (already kept up to
  // date by script.js's updateActiveGuildIcon(), synchronously, whenever a
  // guild is selected) into the hub header's guild chip. Called right when
  // the hub becomes visible rather than watched continuously — simpler and
  // just as correct, since the hub is only ever shown right after a guild
  // (re)selection or via the back button (guild unchanged).
  function syncHubGuildChip() {
    const navIcon = document.getElementById('active-guild-icon');
    const navInitials = document.getElementById('active-guild-initials');
    const navName = document.getElementById('active-guild-name-banner');
    const hubIcon = document.getElementById('hub-guild-icon');
    const hubInitials = document.getElementById('hub-guild-initials');
    const hubName = document.getElementById('hub-guild-name');

    if (hubName && navName && navName.textContent) {
      hubName.textContent = navName.textContent;
    }
    if (hubIcon && navIcon) {
      hubIcon.src = navIcon.src;
      hubIcon.style.display = navIcon.style.display === 'block' ? 'block' : 'none';
    }
    if (hubInitials && navInitials) {
      hubInitials.textContent = navInitials.textContent;
      hubInitials.style.display = navInitials.style.display === 'flex' ? 'flex' : 'none';
    }
  }

  // --- Guild selection hooks -------------------------------------------
  // A guild is selected either by clicking a .server-card in #servers-grid,
  // or (defensively — the <select> is hidden and normally only driven
  // programmatically by script.js itself) via a 'change' on #guild-select.
  // In both cases script.js's own handling runs first — for the card click,
  // its listener is bound directly on the card (target phase, fires before
  // any ancestor/document-level listener in the bubble phase); for the
  // select, script.js's 'change' listener was registered before this file
  // ran, so it fires first on the same element. By the time our handler
  // runs, script.js has already (synchronously) flipped #config-forms to
  // visible — we immediately override that so the new full-page hub shows
  // instead, and #config-forms only appears once a category tile is picked.
  if (serversGrid) {
    document.addEventListener('click', (event) => {
      const card = event.target && event.target.closest ? event.target.closest('.server-card') : null;
      if (card && serversGrid.contains(card)) {
        setViewState('hub');
      }
    });
  }

  if (guildSelectEl) {
    guildSelectEl.addEventListener('change', () => {
      setViewState(guildSelectEl.value ? 'hub' : 'no-guild');
    });
  }

  // "Changer de serveur" — from the navbar guild icon or the (unmodified)
  // config-forms banner — resets to the guild picker via script.js's own
  // resetToGuildSelection(). We just mirror that into our state machine.
  [activeGuildTrigger, btnChangeGuildBanner].forEach(el => {
    if (el) {
      el.addEventListener('click', () => setViewState('no-guild'));
    }
  });

  // The hub's own "Changer de serveur" button reuses that exact same logic
  // by simply re-dispatching a click on the navbar trigger, rather than
  // duplicating script.js's reset/fetch logic here.
  if (btnChangeGuildHub) {
    btnChangeGuildHub.addEventListener('click', () => {
      if (activeGuildTrigger) activeGuildTrigger.click();
    });
  }

  // --- Back button: category view -> hub --------------------------------
  if (sidebarBackBtn) {
    sidebarBackBtn.addEventListener('click', () => {
      setViewState('hub');
    });
  }

  // --- Sidebar collapse/expand rail (desktop only) -----------------------
  if (sidebarCollapseToggle && dashboardMain) {
    sidebarCollapseToggle.addEventListener('click', () => {
      const collapsed = dashboardMain.classList.toggle('sidebar-collapsed');
      sidebarCollapseToggle.title = collapsed ? 'Étendre le menu' : 'Réduire le menu';
    });
  }

  // Give every tab-btn a title tooltip so the label is still available on
  // hover once the sidebar is collapsed to its icon-only rail.
  categories.forEach(cat => {
    cat.querySelectorAll('.tab-btn').forEach(btn => {
      if (btn.title) return;
      const clone = btn.cloneNode(true);
      clone.querySelectorAll('.nav-badge, i').forEach(node => node.remove());
      const label = clone.textContent.replace(/\s+/g, ' ').trim();
      if (label) btn.title = label;
    });
  });

  // --- Category list visibility inside the sidebar (existing behaviour) --
  function getCategory(slug) {
    return categories.find(cat => cat.dataset.category === slug);
  }

  function setActiveTile(slug) {
    tiles.forEach(tile => {
      tile.classList.toggle('active', tile.dataset.category === slug);
    });
  }

  function showOnlyCategory(slug, animate) {
    categories.forEach(cat => {
      // Clear any pending "hide after fade-out" timer for this block.
      const pending = hideTimers.get(cat);
      if (pending) {
        window.clearTimeout(pending);
        hideTimers.delete(cat);
      }

      const isMatch = cat.dataset.category === slug;

      if (isMatch) {
        cat.style.display = '';
        cat.classList.remove('category-hidden');
        if (animate) {
          cat.classList.remove('category-enter');
          // Force reflow so the enter animation restarts reliably.
          void cat.offsetWidth;
          cat.classList.add('category-enter');
        }
      } else {
        cat.classList.add('category-hidden');
        cat.classList.remove('category-enter');
        const timer = window.setTimeout(() => {
          if (cat.classList.contains('category-hidden')) {
            cat.style.display = 'none';
          }
          hideTimers.delete(cat);
        }, HIDE_DELAY_MS);
        hideTimers.set(cat, timer);
      }
    });
  }

  function showAllCategories() {
    categories.forEach(cat => {
      const pending = hideTimers.get(cat);
      if (pending) {
        window.clearTimeout(pending);
        hideTimers.delete(cat);
      }
      cat.style.display = '';
      cat.classList.remove('category-hidden', 'category-enter');
    });
  }

  // While searching, script.js's own listener (registered before this one,
  // so it always runs first for the same 'input' event) hides/shows
  // individual .tab-btn / .category-title by text match. Once that's done,
  // collapse any category block left with zero visible tab-btn so the
  // search results don't show empty gaps between sections.
  function updateEmptyCategoriesVisibility() {
    categories.forEach(cat => {
      const anyVisible = Array.from(cat.querySelectorAll('.tab-btn'))
        .some(btn => btn.style.display !== 'none');
      cat.classList.toggle('category-empty', !anyVisible);
    });
  }

  // Same idea, one level deeper: while searching, script.js's filter hides
  // individual .tab-btn but has no notion of the .sidebar-subcategory
  // grouping layer added on top of it, so a sub-header whose every button
  // just got hidden would otherwise sit there on its own. Hide those too.
  const subcategories = Array.from(document.querySelectorAll('.sidebar-subcategory'));
  function updateEmptySubcategoriesVisibility() {
    subcategories.forEach(sub => {
      const anyVisible = Array.from(sub.querySelectorAll('.tab-btn'))
        .some(btn => btn.style.display !== 'none');
      sub.style.display = anyVisible ? '' : 'none';
    });
  }

  function activateCategory(slug, opts) {
    const options = opts || {};
    if (!getCategory(slug)) return;
    currentCategory = slug;
    setActiveTile(slug);
    if (!searchActive) {
      showOnlyCategory(slug, options.animate !== false);
    }
  }

  function detectInitialCategory() {
    const activeBtn = document.querySelector('.tab-btn.active');
    if (activeBtn) {
      const parentCat = activeBtn.closest('.sidebar-category[data-category]');
      if (parentCat) return parentCat.dataset.category;
    }
    return categories[0].dataset.category;
  }

  // --- Category tile clicks: pick which list shows in the sidebar AND ---
  // enter the category view (hub -> sidebar + config-forms), opening the
  // category's first tab by default so config-forms is never left blank.
  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const slug = tile.dataset.category;
      if (!slug) return;

      if (slug !== currentCategory || searchActive) {
        activateCategory(slug, { animate: true });
      } else {
        setActiveTile(slug);
      }

      const cat = getCategory(slug);
      if (cat && !cat.querySelector('.tab-btn.active')) {
        const firstBtn = cat.querySelector('.tab-btn');
        if (firstBtn) firstBtn.click();
      }

      setViewState('category');
    });
  });

  // --- Keep the selector in sync whenever a .tab-btn becomes active,
  // whether clicked directly by the user or triggered programmatically
  // elsewhere in script.js (e.g. shortcut links that call .click() on a
  // tab button in a different category). This listener is read-only: it
  // never calls preventDefault/stopPropagation, so script.js's own
  // .tab-btn click handling is untouched. ---
  document.addEventListener('click', (event) => {
    const btn = event.target && event.target.closest ? event.target.closest('.tab-btn') : null;
    if (!btn) return;
    const parentCat = btn.closest('.sidebar-category[data-category]');
    if (!parentCat) return;
    const slug = parentCat.dataset.category;
    if (slug !== currentCategory) {
      currentCategory = slug;
      setActiveTile(slug);
      if (!searchActive) {
        showOnlyCategory(slug, true);
      }
    }
  });

  // --- Search compatibility: while the sidebar search box has a query,
  // reveal every category (script.js's own listener still filters
  // individual .tab-btn / .category-title by text match). When the query
  // is cleared, go back to showing only the selected category. ---
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      const query = event.target.value.trim();
      if (query && !searchActive) {
        searchActive = true;
        selector.classList.add('search-mode');
        showAllCategories();
      } else if (!query && searchActive) {
        searchActive = false;
        selector.classList.remove('search-mode');
        categories.forEach(cat => cat.classList.remove('category-empty'));
        subcategories.forEach(sub => { sub.style.display = ''; });
        showOnlyCategory(currentCategory, true);
      }

      if (searchActive) {
        // Re-evaluate on every keystroke, after script.js's own filter ran.
        updateEmptyCategoriesVisibility();
        updateEmptySubcategoriesVisibility();
      }
    });
  }

  currentCategory = detectInitialCategory();
  activateCategory(currentCategory, { animate: false });

  // Start out on the guild picker; script.js's own showDashboard() always
  // shows #no-guild-selected on login regardless of any previously-selected
  // guild, so this matches it exactly.
  setViewState('no-guild');
});
