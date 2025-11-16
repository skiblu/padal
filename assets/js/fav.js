(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  // Wait until DOM is fully loaded
  document.addEventListener('DOMContentLoaded', () => {
    const favContainer = document.getElementById('favorite-btn-container');
    const allowHistory = !!favContainer;

    // Current page info
    const pageTitle = document.title.split('|')[0].trim(); // strip after pipe
    const currentPage = { title: pageTitle, url: window.location.pathname };

    // --- Storage helpers ---
    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
    const saveRecent = (pages) => localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
    const saveFavorites = (pages) => localStorage.setItem(FAVORITE_KEY, JSON.stringify(pages));

    // --- Update recents ---
    if (allowHistory) {
      let recentPages = getRecent().filter(p => p.url !== currentPage.url);
      recentPages.unshift(currentPage);
      if (recentPages.length > MAX_RECENT) recentPages.pop();
      saveRecent(recentPages);
    }

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

    // --- Render favorites/recent cards ---
    function renderCards(containerId, pages) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      pages.forEach(p => {
        const tr = document.createElement('tr');

        // Title column
        const tdTitle = document.createElement('td');
        const link = document.createElement('a');
        link.href = p.url;
        link.innerText = p.title;
        link.className = 'toc-link';
        tdTitle.appendChild(link);

        // Remove button column
        const tdRemove = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'btn btn-sm btn-outline-danger';
        btn.innerHTML = '<i class="fa fa-trash"></i>';
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
      btn.style.backgroundColor = '#f5d38d';   // calm golden
      btn.style.color = '#000';
      btn.style.border = '1px solid #d4b56b';
      btn.style.borderRadius = '3px';
      btn.style.padding = '0.2rem 0.4rem';     // reduced padding
      btn.style.fontSize = '0.8rem';           // smaller font
      btn.style.cursor = 'pointer';
      btn.style.marginLeft = '0.3rem';
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.minWidth = 'fit-content';

      btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';

      btn.addEventListener('click', () => toggleFavorite(currentPage));

      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;
      btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
      // optional: change color when active
      btn.style.backgroundColor = isFavorite(currentPage) ? '#ffd966' : '#f5d38d';
    }

    // --- Clear buttons ---
    const clearFavBtn = document.getElementById('clear-favorites');
    if (clearFavBtn) clearFavBtn.addEventListener('click', () => { localStorage.removeItem(FAVORITE_KEY); renderFavorites(); });

    const clearRecentBtn = document.getElementById('clear-recent');
    if (clearRecentBtn) clearRecentBtn.addEventListener('click', () => { localStorage.removeItem(RECENT_KEY); renderRecent(); });

    // --- Initialize ---
    createFavoriteButton();
    renderFavorites();
    renderRecent();
  });
})();
