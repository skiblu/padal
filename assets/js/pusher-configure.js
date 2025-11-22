(function () {
  var cfg = window.PUSHER_CONFIG || {};
  var STORAGE_KEY = 'padal_notifications_v1';
  var MAX_HISTORY = 10;

  // utility: linkify URLs in text
  function linkify(text, hrefOverride) {
    if (!text) return '';
    // if explicit href provided, wrap entire text
    if (hrefOverride) {
      return '<a href="' + hrefOverride + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(text) + '</a>';
    }
    // basic url regex
    var urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
    return escapeHtml(text).replace(urlRegex, function (url) {
      var href = url;
      if (!/^https?:\/\//i.test(href)) href = 'http://' + href;
      return '<a href="' + href + '" target="_blank" rel="noopener noreferrer">' + url + '</a>';
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_HISTORY)));
    } catch (e) { /* ignore */ }
  }

  function pushHistory(item) {
    var list = loadHistory();
    list.unshift(item);
    if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
    saveHistory(list);
  }

  // run on DOM ready so elements exist
  document.addEventListener('DOMContentLoaded', function () {
    // Elements used by both fallback UI and Pusher logic
    var count = 0;
    var countEl = document.getElementById('notif-count');
    var popup = document.getElementById('notif-popup');
    var popupBody = document.getElementById('notif-body'); // content container
    var historyListEl = document.getElementById('notif-history');
    var closeBtn = document.getElementById('notif-close');
    var btn = document.getElementById('notif-btn');
    var hideTimer = null;
    var timeout = (cfg && cfg.popupTimeout) || 5000;
    // resolve sensible defaults if config contains empty strings
    var eventName = (cfg && cfg.event) ? cfg.event : 'pooja';
    var channelName = (cfg && cfg.channel) ? cfg.channel : 'padal-notification';

    function showTransient(title, message, link) {
      // increment counter and show counter badge
      count++;
      if (countEl) { countEl.textContent = count; countEl.style.display = 'inline-block'; }

      // build content: title bold + message (linkified)
      var html = '';
      if (title) html += '<div style="font-weight:600;margin-bottom:4px;">' + escapeHtml(title) + '</div>';
      if (message || link) html += '<div>' + linkify(message || '', link) + '</div>';
      if (popupBody) {
        popupBody.innerHTML = html;
        // show popup
        if (popup) popup.style.display = 'block';
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { if (popup) popup.style.display = 'none'; }, timeout);
      }

      // push to history (timestamp)
      pushHistory({ title: title || '', message: message || '', link: link || '', ts: Date.now() });

      // Browser Notification API
      try {
        if ("Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification(title || 'Bhakti Padal', { body: message || '', data: { url: link || null } });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (perm) {
              if (perm === "granted") {
                new Notification(title || 'Bhakti Padal', { body: message || '', data: { url: link || null } });
              }
            });
          }
        }
      } catch (e) {
        console.warn('Notification API error', e);
      }
    }

    function renderHistory() {
      var list = loadHistory();
      if (!historyListEl || !popupBody || !popup) return;
      if (!list.length) {
        popupBody.innerHTML = '<div class="small text-muted">No notifications</div>';
      } else {
        var html = '<div style="max-height:320px;overflow:auto;padding-right:4px;">';
        list.forEach(function (it, idx) {
          var time = new Date(it.ts || Date.now()).toLocaleString();
          var titleHtml = it.title ? '<div style="font-weight:600;">' + escapeHtml(it.title) + '</div>' : '';
          var msgHtml = it.message ? '<div class="small text-muted">' + linkify(it.message, it.link) + '</div>' : (it.link ? '<div class="small text-muted"><a href="' + it.link + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(it.link) + '</a></div>' : '');
          html += '<div class="notif-item" data-idx="' + idx + '" style="padding:.5rem .5rem;border-bottom:1px solid rgba(0,0,0,0.05);cursor:pointer;">' +
                  titleHtml + msgHtml +
                  '<div class="tiny text-muted" style="font-size:.7rem;margin-top:4px;">' + escapeHtml(time) + '</div>' +
                  '</div>';
        });
        html += '</div>';
        popupBody.innerHTML = html;

        // attach click handlers for each .notif-item (open link if available)
        var items = popupBody.querySelectorAll('.notif-item');
        items.forEach(function (el) {
          el.addEventListener('click', function () {
            var idx = parseInt(el.getAttribute('data-idx'), 10);
            var list = loadHistory();
            var item = list[idx];
            if (item && item.link) {
              window.open(item.link, '_blank');
            }
          });
        });
      }
      // show popup
      popup.style.display = 'block';
    }

    // Fallback: if bell image fails or renders at 0x0, hide it and show inline SVG fallback
    (function setupBellFallback() {
      var img = document.getElementById('notif-bell-img');
      var fallback = document.getElementById('notif-svg-fallback');
      if (!img || !fallback) return;

      function showFallback() {
        try { img.style.display = 'none'; fallback.style.display = 'inline-block'; } catch (e) { /* ignore */ }
      }
      if (img.complete) {
        if (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) showFallback();
      } else {
        img.addEventListener('error', showFallback);
        img.addEventListener('load', function () {
          if (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) showFallback();
        });
      }
      setTimeout(function () {
        try { var rect = img.getBoundingClientRect(); if (rect.width === 0 || rect.height === 0) showFallback(); } catch (e) { /* ignore */ }
      }, 300);
    })();

    // Common UI handlers
    if (closeBtn) closeBtn.addEventListener('click', function () { if (popup) popup.style.display = 'none'; });
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // show history when user clicks bell
        renderHistory();
        // clear unread count
        count = 0;
        if (countEl) countEl.style.display = 'none';
      });
    }

    // If no Pusher key configured, stop here (history UI still works)
    if (!cfg.key) {
      console.warn('PUSHER_CONFIG.key not set — skipping pusher initialization.');
      return;
    }

    // Pusher initialization and event binding
    try {
      if (window.Pusher) {
        Pusher.logToConsole = !!cfg.debug;
        var pusher = new Pusher(cfg.key, { cluster: cfg.cluster || 'mt1' });
        var channel = pusher.subscribe(channelName);

        channel.bind(eventName, function (data) {
          // Accept multiple shapes: { title, message, link } or { title, text, url } or raw string
          var title = '';
          var message = '';
          var link = '';

          if (!data) {
            message = 'New notification';
          } else if (typeof data === 'string') {
            message = data;
          } else {
            // common keys
            title = data.title || data.heading || data.h || '';
            message = data.message || data.text || data.body || data.msg || '';
            link = data.link || data.url || data.href || '';
            // if no message but event contains other props, stringify minimally
            if (!message && data.payload) message = JSON.stringify(data.payload);
          }

          showTransient(title, message, link);
        });

        console.info('Pusher subscribed to channel:', channelName, 'event:', eventName);
      } else {
        console.warn('Pusher library not found.');
      }
    } catch (e) {
      console.error('Notification init error', e);
    }
  });
})();
