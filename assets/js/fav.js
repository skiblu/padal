(function () {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  const currentPage = { title: document.title, url: window.location.pathname };

  // --- Storage Helpers ---
  function getRecent() { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  function getFavorites() { return JSON.parse(localStorage.getItem(FAVORITE_KEY)) || []; }
  function saveRecent(pages) { localStorage.setItem(RECENT_KEY, JSON.stringify(pages)); }
  function saveFavorites(favs) { localStorage.setItem(FAVORITE_KEY, JSON.stringify(favs)); }

  // --- Update Recent ---
  function updateRecent() {
    let recentPages = getRecent();
    recentPages = recentPages.filter(p => p.url !== currentPage.url);
    recentPages.unshift(currentPage);
    if (recentPages.length > MAX_RECENT) recentPages.pop();
    saveRecent(recentPages);
  }

  // --- Favorites ---
  function toggleFavorite(page) {
    let favs = getFavorites();
    const index = favs.findIndex(p => p.url === page.url);
    if (index === -1) favs.push(page);
    else favs.splice(index, 1);
    saveFavorites(favs);
    renderFavorites();
    updateFavoriteButton();
  }

  function isFavorite(page) { return getFavorites().some(p => p.url === page.url); }

  // --- Rendering ---
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
      btn.addEventListener('click', e => {
        const url = btn.dataset.url;
        if (containerId === 'favorites-container') {
          const favs = getFavorites().filter(p => p.url !== url);
          saveFavorites(favs);
          renderFavorites();
        } else {
          const recent = getRecent().filter(p => p.url !== url);
          saveRecent(recent);
          renderRecent();
        }
      });
    });
  }

  function renderFavorites() { renderCards('favorites-container', sortPages(getFavorites(), document.getElementById('sort-favorites')?.value)); }
  function renderRecent() { renderCards('recent-container', sortPages(getRecent(), document.getElementById('sort-recent')?.value)); }

  function sortPages(pages, method) {
    if (!method || method === 'default') return pages;
    if (method === 'atoz') return [...pages].sort((a,b) => a.title.localeCompare(b.title));
    return pages;
  }

  // --- Favorite Button ---
  function createFavoriteButton() {
    const container = document.getElementById('favorite-btn-container');
    if (!container) return;
    const btn = document.createElement('button');
    btn.id = 'favorite-btn';
    btn.className = 'btn btn-sm';
    btn.style.marginLeft = '0.5rem';
    btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
    btn.addEventListener('click', () => toggleFavorite(currentPage));
    container.appendChild(btn);
  }

  function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (!btn) return;
    btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
  }

  // --- Clear buttons ---
  function setupClearButtons() {
    const clearFavBtn = document.getElementById('clear-favorites');
    if (clearFavBtn) {
      clearFavBtn.addEventListener('click', () => {
        localStorage.removeItem(FAVORITE_KEY);
        renderFavorites();
      });
    }

    const clearRecentBtn = document.getElementById('clear-recent');
    if (clearRecentBtn) {
      clearRecentBtn.addEventListener('click', () => {
        localStorage.removeItem(RECENT_KEY);
        renderRecent();
      });
    }
  }

  // --- Sort selectors ---
  function setupSortSelectors() {
    const favSort = document.getElementById('sort-favorites');
    if (favSort) favSort.addEventListener('change', renderFavorites);

    const recentSort = document.getElementById('sort-recent');
    if (recentSort) recentSort.addEventListener('change', renderRecent);
  }

  // --- Init ---
  document.addEventListener('DOMContentLoaded', () => {
    updateRecent();
    renderFavorites();
    renderRecent();
    createFavoriteButton();
    setupClearButtons();
    setupSortSelectors();
  });

})();
