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
    <path d="M221.544,85.313c-1.059-3.258-3.875-5.633-7.266-6.125l-65.792-9.561l-29.424-59.618c-1.516-3.071-4.645-5.017-8.07-5.017 s-6.555,1.945-8.07,5.017L73.498,69.627L7.706,79.188c-3.391,0.492-6.207,2.867-7.266,6.125s-0.176,6.835,2.277,9.226 l47.608,46.406l-11.238,65.526c-0.579,3.377,0.809,6.789,3.58,8.803c2.772,2.015,6.445,2.278,9.479,0.685l58.846-30.937 l58.846,30.937c1.317,0.692,2.755,1.034,4.188,1.034c1.866,0,3.723-0.58,5.291-1.719c2.771-2.014,4.159-5.426,3.58-8.803 l-11.238-65.526l47.608-46.406C221.72,92.148,222.603,88.571,221.544,85.313z M155.706,131.359 c-2.121,2.067-3.089,5.046-2.588,7.966l8.955,52.216l-46.893-24.652c-1.312-0.689-2.75-1.034-4.188-1.034s-2.877,0.345-4.188,1.034 L59.911,191.54l8.955-52.216c0.501-2.92-0.467-5.898-2.588-7.966l-37.938-36.98l52.428-7.618c2.932-0.426,5.466-2.267,6.776-4.923 l23.447-47.509l23.447,47.509c1.311,2.656,3.845,4.497,6.776,4.923l52.428,7.618L155.706,131.359z"/>
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
        text.textContent = 'Remove from Favorites';
      } else {
        btn.classList.remove('active');
        iconSpan.innerHTML = starSVG;
        text.textContent = 'Add to Favorites';
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
