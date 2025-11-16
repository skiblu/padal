(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  document.addEventListener('DOMContentLoaded', () => {
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
