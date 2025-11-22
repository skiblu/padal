(function () {
  var cfg = window.PUSHER_CONFIG || {};

  // run on DOM ready so elements exist
  document.addEventListener('DOMContentLoaded', function () {
    // Elements used by both fallback UI and Pusher logic
    var count = 0;
    var countEl = document.getElementById('notif-count');
    var popup = document.getElementById('notif-popup');
    var msgEl = document.getElementById('notif-msg');
    var closeBtn = document.getElementById('notif-close');
    var btn = document.getElementById('notif-btn');
    var hideTimer = null;
    var timeout = (cfg && cfg.popupTimeout) || 5000;
    // default to the same names as your example unless overridden
    var eventName = (cfg && cfg.event);

    // small helper to show notification popup and increment counter
    function showNotification(text) {
      count++;
      if (countEl) {
        countEl.textContent = count;
        countEl.style.display = 'inline-block';
      }
      if (msgEl && popup) {
        msgEl.textContent = text || 'New notification';
        popup.style.display = 'block';
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(function () { popup.style.display = 'none'; }, timeout);
      }
    }

    // Fallback: if bell image fails or renders at 0x0, hide it and show inline SVG fallback
    (function setupBellFallback() {
      var img = document.getElementById('notif-bell-img');
      var fallback = document.getElementById('notif-svg-fallback');
      if (!img || !fallback) return;

      function showFallback() {
        try {
          img.style.display = 'none';
          fallback.style.display = 'inline-block';
        } catch (e) { /* ignore */ }
      }

      if (img.complete) {
        if (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) showFallback();
      } else {
        img.addEventListener('error', showFallback);
        img.addEventListener('load', function () {
          if (typeof img.naturalWidth !== 'undefined' && img.naturalWidth === 0) showFallback();
        });
      }

      // Extra safeguard: some SVGs may load but be invisible due to CSS; check after short delay.
      setTimeout(function () {
        try {
          var rect = img.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) showFallback();
        } catch (e) { /* ignore */ }
      }, 300);
    })();

    // Common UI handlers (available even if Pusher isn't configured)
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { if (popup) popup.style.display = 'none'; });
    }
    if (btn) {
      btn.addEventListener('click', function () { count = 0; if (countEl) countEl.style.display = 'none'; });
    }

    // If no Pusher key configured, stop here
    if (!cfg.key) {
      // no-op Pusher; fallback and click handlers already set
      return;
    }

    // Pusher initialization and event binding
    try {
      if (window.Pusher) {
        // enable optional console logging when cfg.debug is truthy
        Pusher.logToConsole = !!cfg.debug;
        var pusher = new Pusher(cfg.key, { cluster: cfg.cluster || 'mt1' });
        var channel = pusher.subscribe(cfg.channel);

        channel.bind(eventName, function (data) {
          var text = 'New notification';
          if (data) text = data.message || data.title || text;
          showNotification(text);
        });

      } else {
        console.warn('Pusher library not found.');
      }
    } catch (e) {
      console.error('Notification init error', e);
    }
  });
})();
