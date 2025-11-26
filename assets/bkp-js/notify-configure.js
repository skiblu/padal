(function () {
  var cfg = window.NOTIFY_CONFIG || {};
  var STORAGE_KEY = 'padal_notifications_v1';
  var MAX_HISTORY = 10;

  // utility: linkify URLs in text
  function linkify(text, hrefOverride) {
    if (!text && !hrefOverride) return '';
    var t = text || '';
    // if explicit href provided, wrap entire text
    if (hrefOverride) {
      return '<a href="' + hrefOverride + '" rel="noopener noreferrer">' + escapeHtml(t) + '</a>';
    }
    // basic url regex
    var urlRegex = /((https?:\/\/|www\.)[^\s<]+)/gi;
    return escapeHtml(t).replace(urlRegex, function (url) {
      var href = url;
      if (!/^https?:\/\//i.test(href)) href = 'http://' + href;
      return '<a href="' + href + '" rel="noopener noreferrer">' + escapeHtml(url) + '</a>';
    });
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
    });
  }

  function loadHistory() {
    try { var raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e) { return []; }
  }

  function saveHistory(list) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_HISTORY))); } catch (e) { /* ignore */ }
  }

  // Add: remove items older than `hours` (keeps most recent first order)
  function pruneOldHours(hours) {
    try {
      var cutoff = Date.now() - (hours * 60 * 60 * 1000);
      var list = loadHistory();
      var filtered = list.filter(function (it) { return it && it.ts && it.ts >= cutoff; });
      if (filtered.length !== list.length) saveHistory(filtered);
    } catch (e) { /* ignore */ }
  }

  function pushHistory(item) {
    try {
      var list = loadHistory();
      list.unshift(item);
      if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY);
      saveHistory(list);
    } catch (e) { /* ignore */ }
  }

  // run on DOM ready so elements exist
  document.addEventListener('DOMContentLoaded', function () {
    // If global NOTIFY_CONFIG not provided, read from #notif-btn data-* attributes
    try {
      if (!cfg || Object.keys(cfg).length === 0) {
        var btnEl = document.getElementById('notif-btn');
        if (btnEl && btnEl.dataset) {
          cfg = cfg || {};
          var ds = btnEl.dataset;
          // strings as provided by Liquid; normalize types
          if (ds.ablyKey) cfg.ablyKey = ds.ablyKey;
          if (ds.ablyChannel) cfg.ablyChannel = ds.ablyChannel;
          if (ds.ablyEvent) cfg.ablyEvent = ds.ablyEvent;
          if (ds.popupTimeout) cfg.popupTimeout = parseInt(ds.popupTimeout, 10) || 5000;
          if (typeof ds.debug !== 'undefined') {
            // data-debug may be "true"/"false" or JSON boolean
            cfg.debug = (String(ds.debug).toLowerCase() === 'true');
          }
          if (ds.historyLimit) cfg.historyLimit = parseInt(ds.historyLimit, 10) || 10;
        }
      } else {
        // ensure numeric/boolean normalization if window.NOTIFY_CONFIG was injected
        if (cfg.popupTimeout) cfg.popupTimeout = parseInt(cfg.popupTimeout, 10) || 5000;
        cfg.debug = !!cfg.debug;
        cfg.historyLimit = parseInt(cfg.historyLimit || 10, 10);
      }
    } catch (e) {
      cfg = cfg || {};
    }

    // Elements used by both fallback UI and Ably logic
    var count = 0;
    var countEl = document.getElementById('notif-count');
    var popup = document.getElementById('notif-popup');
    var popupBody = document.getElementById('notif-body'); // content container
    var closeBtn = document.getElementById('notif-close');
    var btn = document.getElementById('notif-btn');
    var hideTimer = null;
    var HISTORY_LIMIT = (cfg && cfg.historyLimit) ? parseInt(cfg.historyLimit, 10) : MAX_HISTORY;
    var timeout = (cfg && cfg.popupTimeout) ? parseInt(cfg.popupTimeout, 10) : 10000;

    // Ably-only
    var channelName = window.NOTIFY_UTILS.defaultChannelName();
    var eventName = window.NOTIFY_UTILS.defaultEventName();

    function showTransient(title, message, link) {
      // increment counter and show counter badge
      count++;
      if (countEl) { countEl.textContent = String(count); countEl.style.display = 'inline-block'; }

      // build content: title bold + message (linkified)
      var timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      var titleHtml = title ? '<div style="font-weight:600;margin-bottom:4px;">' + escapeHtml(title) + '</div>' : '';
      var msgHtml = (message || link) ? '<div>' + linkify(message || '', link) + '</div>' : '';
      var timeHtml = '<div style="font-size:0.75rem;color:#6c757d;margin-top:6px;">' + escapeHtml(timeStr) + '</div>';
      var html = '<div>' + titleHtml + msgHtml + timeHtml + '</div>';

      if (popupBody) {
        popupBody.innerHTML = html;
        // show popup
        if (popup) popup.style.display = 'block';
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { if (popup) popup.style.display = 'none'; }, timeout);
      }

      // push to history (timestamp) - respect HISTORY_LIMIT when saving
      pushHistory({ title: title || '', message: message || '', link: link || '', ts: Date.now() });

      // Browser Notification API
      try {
        if ("Notification" in window) {
          var notifyTitle = title || 'Bhakti Padal';
          var options = { body: message || '', data: { url: link || null } };
          if (Notification.permission === "granted") {
            new Notification(notifyTitle, options);
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(function (perm) {
              if (perm === "granted") new Notification(notifyTitle, options);
            });
          }
        }
      } catch (e) { /* ignore */ }
    }

    function renderHistory() {
      var list = loadHistory().slice(0, HISTORY_LIMIT);
      if (!popupBody || !popup) return;
      if (!list.length) {
        popupBody.innerHTML = '<div class="small text-muted">No notifications</div>';
      } else {
        var html = '<div style="max-height:320px;overflow:auto;padding-right:4px;">';
        list.forEach(function (it, idx) {
          var time = new Date(it.ts || Date.now()).toLocaleString();
          var titleHtml = it.title ? '<div style="font-weight:600;">' + escapeHtml(it.title) + '</div>' : '';
          var msgHtml = it.message ? '<div class="small text-muted">' + linkify(it.message, it.link) + '</div>' : (it.link ? '<div class="small text-muted"><a href="' + it.link + '" rel="noopener noreferrer">' + escapeHtml(it.link) + '</a></div>' : '');
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
            var listNow = loadHistory().slice(0, HISTORY_LIMIT);
            var item = listNow[idx];
            if (item && item.link) {
              window.open(item.link, '_blank');
            }
          });
        });
      }
      // show popup
      popup.style.display = 'block';
    }

    // Common UI handlers
    if (closeBtn) closeBtn.addEventListener('click', function () { if (popup) popup.style.display = 'none'; });
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        // toggle popup visibility
        if (popup && popup.style.display && popup.style.display !== 'none') {
          popup.style.display = 'none';
          return;
        }
        // PRUNE: remove notifications older than 3 hours before showing history
        pruneOldHours(3);

        // show history when user clicks bell
        renderHistory();
        // clear unread count
        count = 0;
        if (countEl) { countEl.style.display = 'none'; countEl.textContent = '0'; }
      });
    }

    // Ably init
    var ablyKey = (cfg && typeof cfg.ablyKey === 'string' && cfg.ablyKey.trim()) ? cfg.ablyKey.trim() : '';

    if (!ablyKey) {
      console.warn('Ably key not configured (NOTIFY_CONFIG.ablyKey) — skipping realtime init.');
      return;
    }

    function initAbly() {
      try {
        var ablyClient = new Ably.Realtime(ablyKey);
        // optional debug logging
        if (cfg.debug) {
          ablyClient.connection.on(function (stateChange) { console.info('Ably state:', stateChange); });
        }
        var channel = ablyClient.channels.get(channelName);
        channel.subscribe(eventName, function (message) {
          // Ably message.data contains payload
          var data = message && message.data ? message.data : message;
          var title = '';
          var messageText = '';
          var link = '';
          if (!data) {
            messageText = 'New notification';
          } else if (typeof data === 'string') {
            messageText = data;
          } else {
            title = data.title || data.heading || data.h || '';
            messageText = data.message || data.text || data.body || data.msg || '';
            link = data.link || data.url || data.href || '';
            if (!messageText && data.payload) messageText = JSON.stringify(data.payload);
          }
          showTransient(title, messageText, link);
        });
      } catch (e) {
        console.error('Ably initialization failed', e);
      }
    }

    // Load Ably library dynamically if not present
    if (typeof Ably === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://cdn.ably.io/lib/ably.min-1.js';
      s.async = true;
      s.onload = function () { initAbly(); };
      s.onerror = function () { console.error('Failed to load Ably library'); };
      document.head.appendChild(s);
    } else {
      initAbly();
    }
  });
})();
