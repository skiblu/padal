(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  document.addEventListener('DOMContentLoaded', () => {
    const favContainer = document.getElementById('favorite-btn-container');
    const allowHistory = !!favContainer;

    // Current page info
    const pageTitle = document.title.split('|')[0].trim(); // remove pipe suffix
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

    // --- Render table rows ---
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
        tdRemove.className = 'text-center';
        const btn = document.createElement('button');
        btn.className = 'remove-btn';
        btn.innerHTML = `<i class="bi bi-trash"></i>`; // Bootstrap icon
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

    // --- Favorite button on page ---
    function createFavoriteButton() {
      if (!favContainer) return;

      const btn = document.createElement('button');
      btn.id = 'favorite-btn';
      btn.className = 'favorite-btn';
      if (isFavorite(currentPage)) btn.classList.add('active');

      const icon = document.createElement('i');
      icon.className = 'bi bi-star'; // empty star
      if (isFavorite(currentPage)) icon.className = 'bi bi-star-fill'; // filled if active
      btn.appendChild(icon);

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

    // --- Initialize ---
    createFavoriteButton();
    renderFavorites();
    renderRecent();
  });
})();
