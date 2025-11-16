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

    // --- Add current page to recent ---
    if (allowHistory) {
      let recs = getRecent().filter(p => p.url !== currentPage.url);
      recs.unshift(currentPage);
      if (recs.length > MAX_RECENT) recs.pop();
      saveRecent(recs);
    }

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

    // --- Render Favorites / Recent tables ---
    function renderCards(containerId, pages) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Sort if table has a select dropdown
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
        btn.title = 'Remove';

        // Use SVG file from assets
        const img = document.createElement('img');
        img.src = '/assets/bootstrap-icons/trash.svg';
        img.width = 16;
        img.height = 16;
        btn.appendChild(img);

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

      // Use SVG from assets/bootstrap-icons
      const iconPath = isFavorite(currentPage)
        ? '/assets/bootstrap-icons/star-fill.svg'
        : '/assets/bootstrap-icons/star.svg';
      const iconImg = document.createElement('img');
      iconImg.src = iconPath;
      iconImg.width = 16;
      iconImg.height = 16;
      iconImg.style.marginRight = '4px';
      btn.appendChild(iconImg);

      const text = document.createElement('span');
      text.textContent = isFavorite(currentPage) ? 'Remove' : 'Add';
      btn.appendChild(text);

      btn.addEventListener('click', () => {
        toggleFavorite(currentPage);
        updateFavoriteButton();
      });

      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;

      const img = btn.querySelector('img');
      const text = btn.querySelector('span');

      if (isFavorite(currentPage)) {
        btn.classList.add('active');
        img.src = '/assets/bootstrap-icons/star-fill.svg';
        text.textContent = 'Remove';
      } else {
        btn.classList.remove('active');
        img.src = '/assets/bootstrap-icons/star.svg';
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

    // --- Table sorting ---
    function setupTableSort(selectId, containerId) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.addEventListener('change', () => {
        renderCards(containerId, containerId === 'favorites-container' ? getFavorites() : getRecent());
      });
    }

    setupTableSort('sort-favorites', 'favorites-container');
    setupTableSort('sort-recent', 'recent-container');

    // --- TOC / Sub-TOC sort ---
    function setupTocSortWithIcons(buttonClass, defaultId, atozId) {
      const buttons = document.querySelectorAll(buttonClass);
      const defaultDiv = document.getElementById(defaultId);
      const atozDiv = document.getElementById(atozId);

      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const sortType = btn.getAttribute('data-sort');

          if (sortType === 'atoz') {
            defaultDiv.style.display = 'none';
            atozDiv.style.display = 'block';
          } else {
            defaultDiv.style.display = 'block';
            atozDiv.style.display = 'none';
          }

          // Update active state
          buttons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
    }

    setupTocSortWithIcons('.toc-sort-btn', 'toc-default', 'toc-atoz');
    setupTocSortWithIcons('.toc-sort-btn-sub', 'toc-sub-default', 'toc-sub-atoz');

    // --- Initialize favorites / recent / buttons ---
    if (allowHistory) createFavoriteButton();
    renderFavorites();
    renderRecent();

  });

})();
