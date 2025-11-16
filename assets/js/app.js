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

    const getRecent = () => JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
    const getFavorites = () => JSON.parse(localStorage.getItem(FAVORITE_KEY)) || [];
    const saveRecent = (pages) => localStorage.setItem(RECENT_KEY, JSON.stringify(pages));
    const saveFavorites = (pages) => localStorage.setItem(FAVORITE_KEY, JSON.stringify(pages));

    async function loadSVG(filename) {
      const url = `/assets/_includes/bootstrap-icons/${filename}`;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`SVG not found: ${filename}`);
        return await res.text();
      } catch (e) {
        console.error(e);
        return '';
      }
    }

    function isFavorite(page) {
      return getFavorites().some(p => p.url === page.url);
    }

    async function toggleFavorite(page) {
      let favs = getFavorites();
      const idx = favs.findIndex(p => p.url === page.url);
      if (idx === -1) favs.push(page);
      else favs.splice(idx, 1);
      saveFavorites(favs);
      await updateFavoriteButton();
      await renderFavorites();
    }

    async function renderCards(containerId, pages) {
      const container = document.getElementById(containerId);
      if (!container) return;

      const sortSelect = container.parentNode.querySelector('select');
      let sortedPages = [...pages];
      if (sortSelect && sortSelect.value === 'atoz') {
        sortedPages.sort((a, b) => a.title.localeCompare(b.title));
      }

      const trashSVG = await loadSVG('trash.svg');

      container.innerHTML = '';
      sortedPages.forEach(p => {
        const tr = document.createElement('tr');

        const tdTitle = document.createElement('td');
        const link = document.createElement('a');
        link.href = p.url;
        link.innerText = p.title;
        link.className = 'toc-link';
        tdTitle.appendChild(link);

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

    async function createFavoriteButton() {
      if (!favContainer) return;

      const btn = document.createElement('button');
      btn.id = 'favorite-btn';
      btn.className = 'favorite-btn';
      if (isFavorite(currentPage)) btn.classList.add('active');

      const starSVG = await loadSVG(isFavorite(currentPage) ? 'star-fill.svg' : 'star.svg');

      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = starSVG;
      btn.appendChild(iconSpan);

      const text = document.createElement('span');
      text.textContent = isFavorite(currentPage) ? 'Remove' : 'Add';
      btn.appendChild(text);

      btn.addEventListener('click', () => toggleFavorite(currentPage));

      favContainer.appendChild(btn);
    }

    async function updateFavoriteButton() {
      const btn = document.getElementById('favorite-btn');
      if (!btn) return;

      const iconSpan = btn.querySelector('span:first-child');
      const text = btn.querySelector('span:last-child');

      const starSVG = await loadSVG(isFavorite(currentPage) ? 'star-fill.svg' : 'star.svg');
      iconSpan.innerHTML = starSVG;
      text.textContent = isFavorite(currentPage) ? 'Remove' : 'Add';

      btn.classList.toggle('active', isFavorite(currentPage));
    }

    async function setupTableSort(selectId, containerId) {
      const sel = document.getElementById(selectId);
      if (!sel) return;
      sel.addEventListener('change', async () => {
        await renderCards(containerId, containerId === 'favorites-container' ? getFavorites() : getRecent());
      });
    }

    function setupTocSort(radioName, defaultId, atozId) {
      const radios = document.querySelectorAll(`input[name='${radioName}']`);
      const defaultDiv = document.getElementById(defaultId);
      const atozDiv = document.getElementById(atozId);
      if (!radios || !defaultDiv || !atozDiv) return;

      radios.forEach(rb => {
        rb.addEventListener('change', function() {
          defaultDiv.style.display = this.value === 'atoz' ? 'none' : 'block';
          atozDiv.style.display = this.value === 'atoz' ? 'block' : 'none';
        });
      });
    }

    // --- Initialize ---
    if (allowHistory) createFavoriteButton();
    renderFavorites();
    renderRecent();

    setupTableSort('sort-favorites', 'favorites-container');
    setupTableSort('sort-recent', 'recent-container');

    setupTocSort('tocSort', 'toc-default', 'toc-atoz');
    setupTocSort('tocSortSub', 'toc-sub-default', 'toc-sub-atoz');

    if (allowHistory) {
      let recs = getRecent().filter(p => p.url !== currentPage.url);
      recs.unshift(currentPage);
      if (recs.length > MAX_RECENT) recs.pop();
      saveRecent(recs);
    }
  });
})();
