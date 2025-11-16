(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  document.addEventListener('DOMContentLoaded', () => {

    // --- Helper functions ---
    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
    const saveRecent = (pages) => localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
    const saveFavorites = (pages) => localStorage.setItem(FAVORITE_KEY, JSON.stringify(pages));

    const currentPage = {
      title: document.title.split('|')[0].trim(),
      url: window.location.pathname
    };

    const favContainer = document.getElementById('favorite-btn-container');
    const allowHistory = !!favContainer;

    // --- Favorites helpers ---
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

      // Sort if table has a sort select
      const sortSelect = container.parentNode.querySelector('select');
      let sortedPages = [...pages];
      if (sortSelect && sortSelect.value === 'atoz') {
        sortedPages.sort((a, b) => a.title.localeCompare(b.title));
      }

      container.innerHTML = '';
      sortedPages.forEach(p => {
        const tr = document.createElement('tr');

        const tdTitle = document.createElement('td');
        const link = document.createElement('a');
        link.href = p.url;
        link.innerText = p.title;
        link.className = 'toc-link';
        tdTitle.appendChild(link);

        const tdRemove = document.createElement('td');
        tdRemove.className = 'text-center';
        const btn = document.createElement('button');
        btn.className = 'remove-btn';
        btn.innerHTML = `<i class="bi bi-trash"></i>`;
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

      const icon = document.createElement('i');
      icon.className = isFavorite(currentPage) ? 'bi bi-star-fill' : 'bi bi-star';
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
      const icon = btn.querySelector('i');
      const text = btn.querySelector('span');

      if (isFavorite(currentPage)) {
        btn.classList.add('active');
        icon.className = 'bi bi-star-fill';
        text.textContent = 'Remove';
      } else {
        btn.classList.remove('active');
        icon.className = 'bi bi-star';
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

    // --- Sorting for TOC / Sub-TOC ---
    function setupTocSort(radioName, defaultId, atozId) {
      const radios = document.querySelectorAll(`input[name='${radioName}']`);
      const defaultDiv = document.getElementById(defaultId);
      const atozDiv = document.getElementById(atozId);
      if (!radios || !defaultDiv || !atozDiv) return;

      radios.forEach(rb => {
        rb.addEventListener('change', function() {
          if (this.value === 'atoz') {
            defaultDiv.style.display = 'none';
            atozDiv.style.display = 'block';
          } else {
            defaultDiv.style.display = 'block';
            atozDiv.style.display = 'none';
          }
        });
      });
    }

    // --- Sorting for Favorites/Recent Tables ---
    function setupTableSort(selectId, containerId) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.addEventListener('change', () => {
        renderCards(containerId, containerId === 'favorites-container' ? getFavorites() : getRecent());
      });
    }

    // --- Initialize all ---
    if (allowHistory) createFavoriteButton();
    renderFavorites();
    renderRecent();

    // Favorites/Recent table sorts
    setupTableSort('sort-favorites', 'favorites-container');
    setupTableSort('sort-recent', 'recent-container');

    // TOC sorts
    setupTocSort('tocSort', 'toc-default', 'toc-atoz');
    setupTocSort('tocSortSub', 'toc-sub-default', 'toc-sub-atoz');

    // Add current page to recent
    if (allowHistory) {
      let recs = getRecent().filter(p => p.url !== currentPage.url);
      recs.unshift(currentPage);
      if (recs.length > MAX_RECENT) recs.pop();
      saveRecent(recs);
    }

  });
})();
