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

    function updateFavoriteButton(isFav) {
        const btn = document.getElementById("favorite-btn");
        if (!btn) return;

        const icon = btn.querySelector("i");
        const label = btn.querySelector(".fav-label");

        if (isFav) {
            btn.classList.add("active");
            icon.classList.remove("bi-star");
            icon.classList.add("bi-star-fill");
            label.textContent = "Saved";
        } else {
            btn.classList.remove("active");
            icon.classList.remove("bi-star-fill");
            icon.classList.add("bi-star");
            label.textContent = "Add";
        }
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
