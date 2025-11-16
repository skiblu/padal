(function () {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  document.addEventListener('DOMContentLoaded', () => {

    /* =========================================================
       LOAD TRASH SVG FROM LAYOUT (works even in external JS)
    ========================================================== */
    const trashIcon = document.getElementById("trash-icon")
      ? document.getElementById("trash-icon").innerHTML
      : '<span style="font-size:14px;">✖</span>';

    /* =========================================================
       FAVORITES + RECENT
    ========================================================== */

    const favContainer = document.getElementById('favorite-btn-container');
    const allowHistory = !!favContainer;

    const pageTitle = document.title.split('|')[0].trim();
    const currentPage = { title: pageTitle, url: window.location.pathname };

    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
    const saveRecent = (pages) => localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
    const saveFavorites = (pages) => localStorage.setItem(FAVORITE_KEY, JSON.stringify(pages));

    // ---- Update Recents ----
    if (allowHistory) {
      let recentPages = getRecent().filter(p => p.url !== currentPage.url);
      recentPages.unshift(currentPage);
      if (recentPages.length > MAX_RECENT) recentPages.pop();
      saveRecent(recentPages);
    }

    // ---- Favorite helpers ----
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

    // ---- Render Cards (Favorites + Recent) ----
    function renderCards(containerId, pages) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = '';

      pages.forEach(p => {
        const tr = document.createElement('tr');

        // Title
        const tdTitle = document.createElement('td');
        tdTitle.innerHTML = `<a href="${p.url}" class="toc-link">${p.title}</a>`;

        // Remove button
        const tdRemove = document.createElement('td');
        const btn = document.createElement('button');
        btn.className = 'fav-remove-btn';
        btn.innerHTML = trashIcon;

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

    /* =========================================================
       FAVORITE BUTTON (small)
    ========================================================== */

    function createFavoriteButton() {
      if (!favContainer) return;

      const btn = document.createElement('button');
      btn.id = 'favorite-btn';
      btn.style.backgroundColor = '#f5d38d';
      btn.style.border = '1px solid #d4b56b';
      btn.style.borderRadius = '3px';
      btn.style.padding = '0.15rem 0.35rem';
      btn.style.fontSize = '0.75rem';
      btn.style.cursor = 'pointer';
      btn.style.marginLeft = '0.3rem';

      btn.innerText = isFavorite(currentPage) ? '★ Remove' : '☆ Add';

      btn.addEventListener('click', () => toggleFavorite(currentPage));

      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;

      btn.innerText = isFavorite(currentPage) ? '★ Remove' : '☆ Add';
      btn.style.backgroundColor = isFavorite(currentPage) ? '#ffd966' : '#f5d38d';
    }

    // Clear Buttons
    const clearFavBtn = document.getElementById('clear-favorites');
    if (clearFavBtn) clearFavBtn.addEventListener('click', () => { localStorage.removeItem(FAVORITE_KEY); renderFavorites(); });

    const clearRecentBtn = document.getElementById('clear-recent');
    if (clearRecentBtn) clearRecentBtn.addEventListener('click', () => { localStorage.removeItem(RECENT_KEY); renderRecent(); });

    // Init Favorites
    createFavoriteButton();
    renderFavorites();
    renderRecent();

    /* =========================================================
       TOC SORT (A–Z or Default)
    ========================================================== */
    const radioButtons = document.querySelectorAll("input[name='tocSort']");
    const tocDefault = document.getElementById("toc-default");
    const tocAtoZ = document.getElementById("toc-atoz");

    radioButtons.forEach(rb => {
      rb.addEventListener("change", function () {
        if (this.value === "atoz") {
          if (tocDefault) tocDefault.style.display = "none";
          if (tocAtoZ) tocAtoZ.style.display = "block";
        } else {
          if (tocDefault) tocDefault.style.display = "block";
          if (tocAtoZ) tocAtoZ.style.display = "none";
        }
      });
    });
  });
})();
