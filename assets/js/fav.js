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
        const col = document.createElement('div');
        col.className = 'col-12 col-md-4';
        col.innerHTML = `
          <div class="card toc-card h-100">
            <div class="card-body p-3 d-flex flex-column justify-content-between">
              <h3 class="card-title h6 mb-2">
                <a href="${p.url}" class="toc-link stretched-link">${p.title}</a>
              </h3>
              <button class="btn btn-sm btn-outline-danger mt-auto remove-item" data-url="${p.url}">Remove</button>
            </div>
          </div>
        `;
        container.appendChild(col);
      });
      // Attach remove handlers
      container.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const url = btn.dataset.url;
          if (containerId === 'favorites-container') {
            saveFavorites(getFavorites().filter(p => p.url !== url));
            renderFavorites();
          } else {
            saveRecent(getRecent().filter(p => p.url !== url));
            renderRecent();
          }
        });
      });
    }

    function renderFavorites() { renderCards('favorites-container', getFavorites()); }
    function renderRecent() { renderCards('recent-container', getRecent()); }

    // --- Favorite button ---
    function createFavoriteButton() {
      if (!favContainer) return;
      const btn = document.createElement('button');
      btn.id = 'favorite-btn';
      btn.style.backgroundColor = '#f5d38d';
      btn.style.color = '#000';
      btn.style.border = '1px solid #d4b56b';
      btn.style.borderRadius = '4px';
      btn.style.padding = '0.3rem 0.6rem';
      btn.style.cursor = 'pointer';
      btn.style.marginLeft = '0.5rem';
      btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
      btn.addEventListener('click', () => toggleFavorite(currentPage));
      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;
      btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
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
