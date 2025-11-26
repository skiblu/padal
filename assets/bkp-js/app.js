(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  document.addEventListener('DOMContentLoaded', () => {
    // Language selector: initialize from localStorage and reload page on change
    (function setupLanguageSelect() {
      var sel = document.getElementById('site-lang-select');
      if (!sel) return;
      try {
        var stored = localStorage.getItem('site_lang');
        if (stored) sel.value = stored;
      } catch (e) { /* ignore storage errors */ }
      // default to Tamil if nothing selected
      if (!sel.value) sel.value = 'ta';
      sel.addEventListener('change', function () {
        try { localStorage.setItem('site_lang', sel.value); } catch (e) { /* ignore */ }
        // notify other scripts so they can update instantly without reload
        try {
          var ev = new CustomEvent('siteLangChanged', { detail: { lang: sel.value } });
          window.dispatchEvent(ev);
        } catch (e) {
          // fallback: still reload if event dispatch fails
          window.location.reload();
        }
      });
    })();

    // --- lang-filter handling (moved from include) ---
    function _currentLang() {
      try {
        var raw = localStorage.getItem('site_lang');
        return (raw && raw.trim()) ? raw.trim() : 'ta';
      } catch (e) {
        return 'ta';
      }
    }

    function updateLangFilters(lang) {
      try {
        var nodes = document.querySelectorAll('.lang-filter[data-lang]');
        if (!nodes || !nodes.length) return;
        nodes.forEach(function (el) {
          var desired = (el.getAttribute('data-lang') || '').trim();
          if (desired && lang === desired) el.style.display = '';
          else el.style.display = 'none';
        });
      } catch (e) { /* ignore */ }
    }

    // initial apply
    updateLangFilters(_currentLang());
    // respond to changes without reload
    window.addEventListener('siteLangChanged', function (evt) {
      var newLang = (evt && evt.detail && evt.detail.lang) ? evt.detail.lang : _currentLang();
      updateLangFilters(newLang);
    }, false);
    // --- end lang-filter handling ---

    const favContainer = document.getElementById('favorite-btn-container');
    const allowHistory = !!favContainer;

    const currentPage = {
      title: document.title.split('|')[0].trim(),
      url: window.location.pathname
    };

    // --- Storage helpers ---
    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
    const saveRecent = (pages) => localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
    const saveFavorites = (pages) => localStorage.setItem(FAVORITE_KEY, JSON.stringify(pages));

    // --- Favorite helpers ---
    function isFavorite(page) {
      return getFavorites().some(p => p.url === page.url);
    }

    function toggleFavorite(page) {
      let favs = getFavorites();
      const idx = favs.findIndex(p => p.url === page.url);
      if (idx === -1) favs.push(page);
      else favs.splice(idx, 1);
      saveFavorites(favs);
      updateFavoriteButton();
      renderFavorites();
    }

    // --- Render table rows ---
    function renderCards(containerId, pages) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Sorting
      const sortSelect = container.parentNode.querySelector('select');
      let sortedPages = [...pages];
      if (sortSelect && sortSelect.value === 'atoz') {
        sortedPages.sort((a, b) => a.title.localeCompare(b.title));
      }

      container.innerHTML = '';
      sortedPages.forEach(p => {
        const tr = document.createElement('tr');

        // Title
        const tdTitle = document.createElement('td');
        const link = document.createElement('a');
        link.href = p.url;
        link.innerText = p.title;
        link.className = 'toc-link';
        tdTitle.appendChild(link);

        // Remove button
        const tdRemove = document.createElement('td');
        tdRemove.className = 'text-center';
        const btn = document.createElement('button');
        btn.className = 'remove-btn';
        btn.innerHTML = `<img src="/assets/bootstrap-icons/trash.svg" width="14" height="14" alt="Remove">`;
        btn.title = 'Remove';
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (containerId === 'favorites-container') {
            saveFavorites(getFavorites().filter(f => f.url !== p.url));
            renderFavorites();
          } else {
            saveRecent(getRecent().filter(f => f.url !== p.url));
            renderRecent();
          }
        });
        tdRemove.appendChild(btn);

        tr.appendChild(tdTitle);
        tr.appendChild(tdRemove);
        container.appendChild(tr);
      });
    }

    function renderFavorites() { renderCards('favorites-container', getFavorites()); }
    function renderRecent() { renderCards('recent-container', getRecent()); }

    // --- Favorite button ---
    function createFavoriteButton() {
      if (!favContainer) return;

      const btn = document.createElement('button');
      btn.id = 'favorite-btn';
      btn.className = 'favorite-btn';
      if (isFavorite(currentPage)) btn.classList.add('active');

      const icon = document.createElement('img');
      icon.src = isFavorite(currentPage)
        ? '/assets/bootstrap-icons/star-fill.svg'
        : '/assets/bootstrap-icons/star.svg';
      icon.width = 14;
      icon.height = 14;
      icon.alt = 'Favorite';
      btn.appendChild(icon);

      const text = document.createElement('span');
      text.textContent = isFavorite(currentPage) ? 'Remove' : 'Add';
      btn.appendChild(text);

      btn.addEventListener('click', () => toggleFavorite(currentPage));

      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;
      const icon = btn.querySelector('img');
      const text = btn.querySelector('span');

      if (isFavorite(currentPage)) {
        btn.classList.add('active');
        icon.src = '/assets/bootstrap-icons/star-fill.svg';
        text.textContent = 'Remove';
      } else {
        btn.classList.remove('active');
        icon.src = '/assets/bootstrap-icons/star.svg';
        text.textContent = 'Add';
      }
    }

    // --- Clear buttons ---
    const clearFavBtn = document.getElementById('clear-favorites');
    if (clearFavBtn) clearFavBtn.addEventListener('click', () => {
      localStorage.removeItem(FAVORITE_KEY);
      renderFavorites();
    });

    const clearRecentBtn = document.getElementById('clear-recent');
    if (clearRecentBtn) clearRecentBtn.addEventListener('click', () => {
      localStorage.removeItem(RECENT_KEY);
      renderRecent();
    });

    // --- TOC Sort Toggle (Single Button) ---
    function setupTocToggleIcon(buttonId, defaultId, atozId) {
      const btn = document.getElementById(buttonId);
      if (!btn) return;

      const defaultIcon = '/assets/bootstrap-icons/list.svg';
      const atozIcon = '/assets/bootstrap-icons/sort-alpha-down.svg';

      const defaultDiv = document.getElementById(defaultId);
      const atozDiv = document.getElementById(atozId);

      btn.addEventListener('click', () => {
        const sortType = btn.getAttribute('data-sort');

        if (sortType === 'default') {
          defaultDiv.style.display = 'none';
          atozDiv.style.display = 'block';
          btn.setAttribute('data-sort', 'atoz');
          btn.querySelector('img').src = atozIcon;
          btn.title = 'A to Z';
        } else {
          defaultDiv.style.display = 'block';
          atozDiv.style.display = 'none';
          btn.setAttribute('data-sort', 'default');
          btn.querySelector('img').src = defaultIcon;
          btn.title = 'Default';
        }
      });
    }

    // --- Initialize ---
    if (allowHistory) createFavoriteButton();
    renderFavorites();
    renderRecent();

    // Favorites/Recent table sorts
    const setupTableSort = (selectId, containerId) => {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.addEventListener('change', () => {
        renderCards(containerId, containerId === 'favorites-container' ? getFavorites() : getRecent());
      });
    };
    setupTableSort('sort-favorites', 'favorites-container');
    setupTableSort('sort-recent', 'recent-container');

    // TOC Sort toggles
    setupTocToggleIcon('toc-sort-toggle', 'toc-default', 'toc-atoz');
    setupTocToggleIcon('toc-sort-toggle-sub', 'toc-sub-default', 'toc-sub-atoz');

    // Add current page to recent
    if (allowHistory) {
      let recs = getRecent().filter(p => p.url !== currentPage.url);
      recs.unshift(currentPage);
      if (recs.length > MAX_RECENT) recs.pop();
      saveRecent(recs);
    }

  });
})();

// Devtools / right-click / view-source prevention script
 (function () {
    // Disable right-click context menu
    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
    }, { passive: false });

    // Disable common devtools / view-source / save shortcuts
    document.addEventListener('keydown', function (e) {
      // Key codes & helpers
      const k = e.key && e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey; // ctrl on Windows/Linux, cmd on Mac
      const shift = e.shiftKey;

      // Block F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl/Cmd+Shift+I  (Inspect)
      if (ctrl && shift && k === 'i') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl/Cmd+Shift+C  (Inspect element / cursor)
      if (ctrl && shift && k === 'c') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl/Cmd+Shift+J  (Console)
      if (ctrl && shift && k === 'j') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl/Cmd+U (view-source)
      if (ctrl && k === 'u') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Block Ctrl/Cmd+S (save page)
      if (ctrl && k === 's') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    }, true);

    // Optional: simple devtools-open detection (heuristic) and action
    // Note: false positives are possible. Use with caution.
    (function detectDevTools() {
      let open = false;
      const threshold = 160; // tuned value; adjust as needed
      function check() {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        // If devtools docked, large diff appears
        if (widthDiff > threshold || heightDiff > threshold) {
          if (!open) {
            open = true;
            console.warn('DevTools detected');
            // optional action: show a brief overlay, redirect, or log event
            // Example: show a little overlay for casual deterrent:
            // showDevtoolsOverlay();
          }
        } else {
          if (open) {
            open = false;
            removeDevtoolsOverlay();
          }
        }
      }
      setInterval(check, 1000);

      function showDevtoolsOverlay() {
        if (document.getElementById('__dt_overlay')) return;
        const ov = document.createElement('div');
        ov.id = '__dt_overlay';
        ov.style.position = 'fixed';
        ov.style.left = 0;
        ov.style.top = 0;
        ov.style.right = 0;
        ov.style.bottom = 0;
        ov.style.background = 'rgba(0,0,0,0.4)';
        ov.style.color = '#fff';
        ov.style.display = 'flex';
        ov.style.alignItems = 'center';
        ov.style.justifyContent = 'center';
        ov.style.zIndex = 999999;
        ov.style.backdropFilter = 'blur(2px)';
        ov.innerText = 'Developer tools detected — functionality limited.';
        document.documentElement.appendChild(ov);
        // remove after 2s so it doesn't block forever
        setTimeout(removeDevtoolsOverlay, 2000);
      }
      function removeDevtoolsOverlay() {
        const el = document.getElementById('__dt_overlay');
        if (el) el.remove();
      }
    })();

    // Optional: Prevent selection/copy (commented out; enable if you truly want)
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('dragstart', e => e.preventDefault());

 })();