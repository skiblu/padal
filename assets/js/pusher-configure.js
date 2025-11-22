(function () {
  var cfg = window.PUSHER_CONFIG || {};
  if (!cfg.key) return;

  try {
    if (window.Pusher) {
      Pusher.logToConsole = false;
      var pusher = new Pusher(cfg.key, { cluster: cfg.cluster || 'mt1' });
      var channel = pusher.subscribe(cfg.channel || 'notifications');

      var count = 0;
      var countEl = document.getElementById('notif-count');
      var popup = document.getElementById('notif-popup');
      var msgEl = document.getElementById('notif-msg');
      var closeBtn = document.getElementById('notif-close');
      var btn = document.getElementById('notif-btn');
      var hideTimer = null;
      var timeout = cfg.popupTimeout || 5000;
      var eventName = cfg.event || 'new-notification';

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

      channel.bind(eventName, function (data) {
        showNotification(data && (data.message || data.title) ? (data.message || data.title) : 'New notification');
      });

      if (closeBtn) closeBtn.addEventListener('click', function () { popup.style.display = 'none'; });
      if (btn) btn.addEventListener('click', function () { count = 0; if (countEl) countEl.style.display = 'none'; });

    } else {
      console.warn('Pusher library not found.');
    }
  } catch (e) {
    console.error('Notification init error', e);
  }
})();

