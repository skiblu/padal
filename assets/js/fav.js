/**
 * Favorites & Recently Visited Pages for Bhaktipadal
 * Stores in localStorage and renders lists in sidebar
 */

(function () {
  // -----------------------
  // Configuration
  // -----------------------
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  // Current page info
  const currentPage = {
    title: document.title,
    url: window.location.pathname
  };

  // -----------------------
  // LocalStorage Helpers
  // -----------------------
  function getRecent() {
    return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
  }

  function getFavorites() {
    return JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
  }

  function saveRecent(pages) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
  }

  function saveFavorites(favs) {
    localStorage.setItem(FAVORITE_KEY, JSON.stringify(favs));
  }

  // -----------------------
  // Update Recent Pages
  // -----------------------
  function updateRecent() {
    let recentPages = getRecent();

    // Remove current page if already exists
    recentPages = recentPages.filter(p => p.url !== currentPage.url);

    // Add current page at the start
    recentPages.unshift(currentPage);

    // Limit to MAX_RECENT
    if (recentPages.length > MAX_RECENT) recentPages.pop();

    saveRecent(recentPages);
  }

  // -----------------------
  // Favorites
  // -----------------------
  function toggleFavorite(page) {
    let favs = getFavorites();
    const index = favs.findIndex(p => p.url === page.url);
    if (index === -1) {
      favs.push(page);
    } else {
      favs.splice(index, 1);
    }
    saveFavorites(favs);
    renderFavorites();
    updateFavoriteButton();
  }

  function isFavorite(page) {
    const favs = getFavorites();
    return favs.some(p => p.url === page.url);
  }

  // -----------------------
  // Render Functions
  // -----------------------
  function renderList(listId, pages) {
    const listEl = document.getElementById(listId);
    if (!listEl) return;

    listEl.innerHTML = '';
    pages.forEach(p => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${p.url}" class="d-block py-1">${p.title}</a>`;
      listEl.appendChild(li);
    });
  }

  function renderFavorites() {
    renderList('favorite-list', getFavorites());
  }

  function renderRecent() {
    renderList('recent-list', getRecent());
  }

  // -----------------------
  // Favorite Button
  // -----------------------
  function createFavoriteButton() {
    const container = document.getElementById('favorite-btn-container');
    if (!container) return;

    const btn = document.createElement('button');
    btn.id = 'favorite-btn';
    btn.className = 'btn btn-sm';
    btn.style.marginBottom = '1rem';
    btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
    btn.addEventListener('click', () => {
      toggleFavorite(currentPage);
    });
    container.appendChild(btn);
  }

  function updateFavoriteButton() {
    const btn = document.getElementById('favorite-btn');
    if (!btn) return;
    btn.innerText = isFavorite(currentPage) ? '★ Remove from Favorites' : '☆ Add to Favorites';
  }

  // -----------------------
  // Initialize
  // -----------------------
  document.addEventListener('DOMContentLoaded', () => {
    updateRecent();
    renderRecent();
    renderFavorites();
    createFavoriteButton();
  });

})();
// End of fav.js