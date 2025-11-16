(function() {
  const RECENT_KEY = 'bhaktipadal_recent';
  const FAVORITE_KEY = 'bhaktipadal_favorites';
  const MAX_RECENT = 10;

  // --- Inline SVG icons from _includes/bootstrap-icons ---
  const trashSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118z"/>
  </svg>`;

  const starSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star" viewBox="0 0 16 16">
    <path d="M2.866 14.85c-.078.444.36.791.746.593l.39-.178 3.668-1.865L2.866 14.85z"/>
  </svg>`;

  const starFillSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-star-fill" viewBox="0 0 16 16">
    <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73-3.522-3.356c-.329-.314-.158-.888.283-.95l4.898-.696 2.07-4.19c.197-.398.73-.398.927 0l2.07 4.19 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>
  </svg>`;

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
        btn.innerHTML = trashSVG;
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

      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = isFavorite(currentPage) ? starFillSVG : starSVG;

      const text = document.createElement('span');
      text.textContent = isFavorite(currentPage) ? 'Remove' : 'Add';
      text.style.marginLeft = '4px';

      btn.appendChild(iconSpan);
      btn.appendChild(text);

      btn.addEventListener('click', () => {
        toggleFavorite(currentPage);
      });

      favContainer.appendChild(btn);
    }

    function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;
      const iconSpan = btn.querySelector('span:first-child');
      const text = btn.querySelector('span:last-child');
      if (isFavorite(currentPage)) {
        btn.classList.add('active');
        iconSpan.innerHTML = starFillSVG;
        text.textContent = 'Remove';
      } else {
        btn.classList.remove('active');
        iconSpan.innerHTML = starSVG;
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

    setupTocSort('tocSort', 'toc-default', 'toc-atoz');
    setupTocSort('tocSortSub', 'toc-sub-default', 'toc-sub-atoz');

    // --- Initialize favorites / recent / buttons ---
    if (allowHistory) createFavoriteButton();
    renderFavorites();
    renderRecent();

  });

})();
