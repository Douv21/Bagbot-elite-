// embed-builder.js
// Additive, standalone script for Dashboard 2. Owns three things, none of
// which script.js is ever modified to support:
//
//   1. Making the "Envoyeur d'Embeds" (tab-embed-sender) and "Remerciements
//      Boost" (tab-boost) sections editable directly from their live Discord
//      embed preview — the same click-to-edit UX as the existing "Arrivées &
//      Départs" welcome editor — including image upload via the existing
//      POST /api/upload endpoint (reusing script.js's own generic
//      `.file-upload-input` delegation wherever possible, so no new upload
//      code is needed for images at all).
//   2. A small two-way bridge between the new preview-embedded text fields
//      and the original hidden `<input>`/`<textarea>` elements that
//      script.js's own submit/load logic actually reads and writes — so
//      script.js keeps working against the exact same field ids/values it
//      always has, unaware that the visible editing surface moved.
//   3. Turning genuinely multi-channel `<select multiple>` fields (channels,
//      not roles) into a scrollable search + checkbox panel with a trigger
//      and removable chips, without changing what script.js reads from/
//      writes to that same <select> element (.options / .selected /
//      .selectedOptions all keep working exactly as before).
//
// Like category-nav.js, this file never calls preventDefault/stopPropagation
// on anything and only ever *adds* listeners, so script.js's own handling of
// every one of these elements keeps running exactly as before.
document.addEventListener('DOMContentLoaded', () => {

  // Shows/hides an image box's "click to upload" placeholder overlay
  // depending on whether the image inside it currently has a src, mirroring
  // the toggle the welcome editor's own script.js code does for its image
  // box — but generic, since these new image boxes have no equivalent
  // script.js logic of their own to piggyback on.
  function wireImageOverlayToggle(boxId) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const img = box.querySelector('img');
    const overlay = box.querySelector('.discord-image-input-overlay');
    if (!img || !overlay) return;
    const sync = () => {
      const hasImage = img.style.display !== 'none' && !!img.getAttribute('src');
      overlay.style.display = hasImage ? 'none' : 'flex';
    };
    new MutationObserver(sync).observe(img, { attributes: true, attributeFilter: ['style', 'src'] });
    sync();
  }

  // ===========================================================================
  // 1) SIMPLE EMBED SENDER — clickable preview <-> hidden field bridge
  // ===========================================================================
  (function setupSimpleEmbedPreviewBridge() {
    const form = document.getElementById('form-simple-embed');
    if (!form) return;

    // [previewFieldId, hiddenFieldId] pairs. The preview element IS the
    // visible editing surface; the hidden element is what script.js's own
    // initSimpleEmbedSender() reads on submit and writes on load.
    const pairs = [
      ['simple-embed-preview-title', 'simple_embed_title'],
      ['simple-embed-preview-desc', 'simple_embed_desc'],
      ['simple-embed-preview-author-name', 'simple_embed_author_name'],
      ['simple-embed-preview-footer-text', 'simple_embed_footer_text']
    ];

    function forwardToHidden(previewEl, hiddenEl) {
      hiddenEl.value = previewEl.value;
      // script.js's own updatePreview() is bound to this hidden field's
      // 'input' event and re-renders every part of the preview (color bar,
      // image, thumbnail, mention...) from the current hidden field values.
      // Setting .innerText on our (now <input>/<textarea>) preview elements
      // as part of that is a harmless no-op — those elements render their
      // `.value`, not their text content, so nothing visible changes there.
      hiddenEl.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function syncHiddenToPreview() {
      pairs.forEach(([previewId, hiddenId]) => {
        const previewEl = document.getElementById(previewId);
        const hiddenEl = document.getElementById(hiddenId);
        if (!previewEl || !hiddenEl) return;
        if (document.activeElement === previewEl) return; // don't clobber active typing
        previewEl.value = hiddenEl.value;
      });
    }

    pairs.forEach(([previewId, hiddenId]) => {
      const previewEl = document.getElementById(previewId);
      const hiddenEl = document.getElementById(hiddenId);
      if (!previewEl || !hiddenEl) return;
      previewEl.addEventListener('input', () => forwardToHidden(previewEl, hiddenEl));
    });

    // Re-sync preview <- hidden after every action that programmatically
    // rewrites the hidden fields (loading a saved embed, loading a channel's
    // existing embed message, or the "insert my Discord profile" button).
    // These are bubble-phase, document-level listeners, so — regardless of
    // script tag order — they always fire *after* any listener script.js
    // bound directly on the target element itself (target-phase always runs
    // before bubble-phase ancestors), by which point script.js has already
    // finished its own synchronous safeSetVal(...) calls.
    const savedList = document.getElementById('simple-embeds-saved-list');
    if (savedList) {
      document.addEventListener('click', (e) => {
        const btn = e.target && e.target.closest ? e.target.closest('.btn-load-embed') : null;
        if (btn && savedList.contains(btn)) syncHiddenToPreview();
      });
    }

    const channelEmbedsSelect = document.getElementById('select_channel_embeds');
    if (channelEmbedsSelect) {
      document.addEventListener('change', (e) => {
        if (e.target === channelEmbedsSelect) syncHiddenToPreview();
      });
    }

    const useProfileBtn = document.getElementById('btn_simple_embed_use_my_profile');
    if (useProfileBtn) {
      document.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('#btn_simple_embed_use_my_profile')) {
          syncHiddenToPreview();
        }
      });
    }

    // form.reset() (called by script.js after a successful send) fires a
    // bubbling 'reset' event *before* actually clearing field values per the
    // HTML form-reset algorithm, so defer one tick to read the now-cleared
    // hidden fields.
    form.addEventListener('reset', () => {
      window.setTimeout(syncHiddenToPreview, 0);
    });

    // Defensive initial sync (fields start empty either way).
    syncHiddenToPreview();

    wireImageOverlayToggle('simple-embed-image-box');
  })();

  // ---------------------------------------------------------------------
  // Generic "click box to reveal an inline URL-paste field" toggle, used
  // everywhere a side-panel URL input was removed in favour of pasting
  // the link directly on the preview (same underlying field/id as before,
  // matching the reveal-on-click pattern the Arrivées & Départs editor's
  // own script.js code already uses for its image/author-icon fields).
  // ---------------------------------------------------------------------
  function wireUrlPasteToggle(boxId, wrapId, fieldId, excludeSelectors) {
    const box = document.getElementById(boxId);
    const wrap = document.getElementById(wrapId);
    const field = document.getElementById(fieldId);
    if (!box || !wrap) return;
    box.addEventListener('click', (e) => {
      if ((excludeSelectors || []).some(sel => e.target.closest(sel))) return;
      const isOpen = wrap.style.display !== 'none' && !!wrap.style.display;
      if (!isOpen) {
        wrap.style.display = 'flex';
        if (field) field.focus();
      } else if (!field || !field.value) {
        wrap.style.display = 'none';
      }
    });
  }

  // ===========================================================================
  // 1b) SIMPLE EMBED SENDER — thumbnail mini-menu (click the thumbnail in the
  //     preview to choose "aucune / mon avatar / avatar serveur / avatar bot /
  //     URL personnalisée" instead of the old separate side-panel dropdown).
  //     Writes to the same hidden #simple_embed_thumbnail_option <select>
  //     script.js's own updatePreview()/submit logic already reads — this
  //     never re-implements that rendering, it only dispatches 'change' on
  //     the exact same element.
  // ===========================================================================
  (function setupSimpleEmbedThumbnailMenu() {
    const box = document.getElementById('simple-embed-thumbnail-box');
    const popover = document.getElementById('simple-embed-thumbnail-popover');
    const select = document.getElementById('simple_embed_thumbnail_option');
    const placeholder = document.getElementById('simple-embed-thumbnail-placeholder');
    const thumbImg = document.getElementById('simple-embed-preview-thumbnail');
    if (!box || !popover || !select) return;

    function closePopover() {
      popover.style.display = 'none';
    }

    box.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = popover.style.display === 'flex';
      document.querySelectorAll('.thumbnail-option-popover').forEach(p => { p.style.display = 'none'; });
      popover.style.display = isOpen ? 'none' : 'flex';
    });

    // Clicks inside the popover (including the custom URL field) must not
    // bubble to the document-level "click outside closes it" listener.
    popover.addEventListener('click', (e) => e.stopPropagation());

    popover.querySelectorAll('.thumbnail-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-thumb-mode');
        select.value = mode;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        select.dispatchEvent(new Event('input', { bubbles: true }));
        popover.querySelectorAll('.thumbnail-option-btn').forEach(b => b.classList.toggle('active', b === btn));
        if (mode === 'custom') {
          const customInput = document.getElementById('simple_embed_custom_thumb_url');
          if (customInput) customInput.focus();
        } else {
          closePopover();
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !box.contains(e.target)) closePopover();
    });

    if (thumbImg && placeholder) {
      const syncPlaceholder = () => {
        const hasImage = thumbImg.style.display !== 'none' && !!thumbImg.getAttribute('src');
        placeholder.style.display = hasImage ? 'none' : 'flex';
      };
      new MutationObserver(syncPlaceholder).observe(thumbImg, { attributes: true, attributeFilter: ['style', 'src'] });
      syncPlaceholder();
    }
  })();

  // ===========================================================================
  // 1c) SIMPLE EMBED SENDER — URL-paste affordances for the large image and
  //     the author icon, so pasting a link stays possible now that the
  //     standalone side-panel URL fields are gone (upload already worked via
  //     the existing camera/cloud-upload icons in the preview).
  // ===========================================================================
  wireUrlPasteToggle(
    'simple-embed-image-box',
    'simple-embed-image-url-wrap',
    'simple_embed_image',
    ['.url-upload-wrapper', '.btn-upload-label']
  );
  wireUrlPasteToggle(
    'simple-embed-author-avatar-wrap',
    'simple-embed-author-icon-url-wrap',
    'simple_embed_author_icon',
    ['.url-upload-wrapper', '.embed-avatar-upload-btn']
  );

  // ===========================================================================
  // 2) REMERCIEMENTS BOOST — brand new clickable preview (no pre-existing
  //    preview logic in script.js for this section, so this is fully new,
  //    self-contained rendering — nothing to bridge/preserve here).
  // ===========================================================================
  (function setupBoostPreview() {
    const titleEl = document.getElementById('boost_title');
    const descEl = document.getElementById('boost_message');
    const colorEl = document.getElementById('boost_color');
    const imageUrlEl = document.getElementById('boost_image_url');
    const previewContainer = document.getElementById('boost-preview-container');
    const previewImage = document.getElementById('boost-preview-image');
    if (!titleEl || !descEl || !previewContainer) return;

    function render() {
      if (colorEl && previewContainer) {
        previewContainer.style.borderLeftColor = colorEl.value || '#F47FFF';
      }
      if (imageUrlEl && previewImage) {
        const url = imageUrlEl.value.trim();
        if (url) {
          previewImage.src = url;
          previewImage.style.display = 'block';
        } else {
          previewImage.removeAttribute('src');
          previewImage.style.display = 'none';
        }
      }
    }

    [titleEl, descEl, colorEl, imageUrlEl].forEach(el => {
      if (el) el.addEventListener('input', render);
    });

    render();
    wireImageOverlayToggle('boost-image-box');
    wireUrlPasteToggle(
      'boost-image-box',
      'boost-image-url-wrap',
      'boost_image_url',
      ['.url-upload-wrapper', '.btn-upload-label']
    );
  })();

  // ===========================================================================
  // 3) MULTI-CHANNEL SELECTS — scrollable search + checkbox panel with a
  //    trigger and removable chips, layered on top of the existing
  //    <select multiple> element without changing what script.js reads from
  //    / writes to it.
  // ===========================================================================
  function enhanceMultiChannelSelect(selectId, placeholder) {
    const select = document.getElementById(selectId);
    if (!select || !select.multiple) return;
    if (select.dataset.multiChannelEnhanced) return;
    select.dataset.multiChannelEnhanced = 'true';

    select.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'multi-channel-select';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'multi-channel-trigger';
    trigger.innerHTML = `<span class="multi-channel-trigger-label"></span><i class="fa-solid fa-chevron-down"></i>`;
    wrapper.appendChild(trigger);

    const chipsRow = document.createElement('div');
    chipsRow.className = 'multi-channel-chips';
    wrapper.appendChild(chipsRow);

    const panel = document.createElement('div');
    panel.className = 'multi-channel-panel';
    panel.innerHTML = `
      <div class="multi-channel-search-wrap">
        <i class="fa-solid fa-magnifying-glass"></i>
        <input type="text" class="multi-channel-search-input" placeholder="Rechercher un salon...">
      </div>
      <div class="multi-channel-list"></div>
    `;
    wrapper.appendChild(panel);

    const searchInput = panel.querySelector('.multi-channel-search-input');
    const listEl = panel.querySelector('.multi-channel-list');
    const triggerLabel = trigger.querySelector('.multi-channel-trigger-label');

    function selectedOptions() {
      return Array.from(select.options).filter(o => o.selected && o.value);
    }

    function renderTrigger() {
      const sel = selectedOptions();
      triggerLabel.textContent = sel.length === 0
        ? (placeholder || 'Sélectionner des salons...')
        : `${sel.length} salon${sel.length > 1 ? 's' : ''} sélectionné${sel.length > 1 ? 's' : ''}`;
      wrapper.classList.toggle('has-selection', sel.length > 0);
    }

    function renderChips() {
      chipsRow.innerHTML = '';
      selectedOptions().forEach(opt => {
        const chip = document.createElement('span');
        chip.className = 'multi-channel-chip';
        chip.innerHTML = `<i class="fa-solid fa-hashtag"></i><span></span><button type="button" title="Retirer"><i class="fa-solid fa-xmark"></i></button>`;
        chip.querySelector('span').textContent = opt.text;
        chip.querySelector('button').addEventListener('click', (e) => {
          e.stopPropagation();
          opt.selected = false;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          refreshAll();
        });
        chipsRow.appendChild(chip);
      });
    }

    function renderList() {
      const filter = searchInput.value.toLowerCase().trim();
      listEl.innerHTML = '';
      let shown = 0;
      Array.from(select.options).forEach(opt => {
        if (!opt.value) return;
        if (filter && !opt.text.toLowerCase().includes(filter)) return;
        shown++;
        const row = document.createElement('label');
        row.className = 'multi-channel-option';
        row.innerHTML = `<input type="checkbox"><span></span>`;
        const cb = row.querySelector('input');
        cb.checked = opt.selected;
        row.querySelector('span').textContent = opt.text;
        cb.addEventListener('change', () => {
          opt.selected = cb.checked;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          renderTrigger();
          renderChips();
        });
        listEl.appendChild(row);
      });
      if (shown === 0) {
        listEl.innerHTML = '<div class="multi-channel-empty">Aucun salon trouvé.</div>';
      }
    }

    function refreshAll() {
      renderTrigger();
      renderChips();
      if (wrapper.classList.contains('open')) renderList();
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.multi-channel-select.open').forEach(w => {
        if (w !== wrapper) w.classList.remove('open');
      });
      wrapper.classList.toggle('open');
      if (wrapper.classList.contains('open')) {
        searchInput.value = '';
        renderList();
        searchInput.focus();
      }
    });

    searchInput.addEventListener('input', renderList);

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) wrapper.classList.remove('open');
    });

    // The <option> list is populated asynchronously once channels load
    // (elsewhere in script.js), well after this runs on DOMContentLoaded —
    // observe it so the panel/chips reflect the real channel list once it
    // exists.
    new MutationObserver(refreshAll).observe(select, { childList: true });

    // Selection can also be set programmatically (config load setting
    // `option.selected = true` directly, with no event dispatched) — poll
    // lightly to catch that without needing any script.js changes.
    let lastSignature = '';
    window.setInterval(() => {
      const sig = selectedOptions().map(o => o.value).join(',') + '|' + select.options.length;
      if (sig !== lastSignature) {
        lastSignature = sig;
        refreshAll();
      }
    }, 600);

    refreshAll();
  }

  enhanceMultiChannelSelect('quest_channel_ids', 'Tous les salons (aucune restriction)');
  enhanceMultiChannelSelect('star_selfie_channels', 'Sélectionner les salons "Selfie / Outfit"...');
  enhanceMultiChannelSelect('star_nude_channels', 'Sélectionner les salons "Nude / Tease"...');
});
