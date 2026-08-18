// category-nav.js
// Additive, standalone script for Dashboard 2's sidebar category navigation.
//
// This file ONLY manages:
//   - the category tile selector (.category-tile[data-category]) above the
//     sidebar, and
//   - showing/hiding the matching .sidebar-category[data-category] blocks
//     with a smooth fade/slide animation.
//
// It never touches tab-content switching (that stays owned by script.js's
// own .tab-btn click handlers) and never calls preventDefault/stopPropagation
// on any event, so it cannot interfere with script.js's own listeners.
document.addEventListener('DOMContentLoaded', () => {
  const selector = document.getElementById('category-selector');
  const categories = Array.from(document.querySelectorAll('.sidebar-category[data-category]'));
  const searchInput = document.getElementById('sidebar-tab-search');

  if (!selector || !categories.length) return;

  const tiles = Array.from(selector.querySelectorAll('.category-tile[data-category]'));
  const HIDE_DELAY_MS = 240;

  let currentCategory = null;
  let searchActive = false;
  let hideTimers = new Map();

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

  // --- Category tile clicks ---
  tiles.forEach(tile => {
    tile.addEventListener('click', () => {
      const slug = tile.dataset.category;
      if (!slug || (slug === currentCategory && !searchActive)) return;
      activateCategory(slug);
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
        showOnlyCategory(currentCategory, true);
      }

      if (searchActive) {
        // Re-evaluate on every keystroke, after script.js's own filter ran.
        updateEmptyCategoriesVisibility();
      }
    });
  }

  currentCategory = detectInitialCategory();
  activateCategory(currentCategory, { animate: false });
});
