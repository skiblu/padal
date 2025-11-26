document.addEventListener('DOMContentLoaded', function () {
  // show nothing if sharing not allowed
  if (localStorage.getItem('allowSharing') !== 'true') return;

  var container = document.getElementById('share-container');
  // inject icon button and popup markup
  container.innerHTML = ''
    + '<button id="share-btn" class="share-btn" aria-label="Share this page" title="Share this page">'
    +   '<img src="/assets/bootstrap-icons/share.svg" alt="Share"/>'
    + '</button>';

  var popup = document.createElement('div');
  popup.id = 'share-popup';
  popup.innerHTML = ''
    + '<div><strong>Share this page</strong></div>'
    + '<div class="row" style="margin-top:8px;">'
    +   '<input id="share-key" type="password" placeholder="Key" />'
    +   '<button id="share-send">Send</button>'
    + '</div>'
    + '<div class="status" id="share-status" aria-live="polite"></div>';
  document.body.appendChild(popup);

  var btn = document.getElementById('share-btn');
  var popupEl = document.getElementById('share-popup');
  var sendBtn = popupEl.querySelector('#share-send');
  var keyInput = popupEl.querySelector('#share-key');
  var statusEl = popupEl.querySelector('#share-status');

  btn.addEventListener('click', function (e) {
    e.preventDefault();
    popupEl.style.display = (popupEl.style.display === 'block') ? 'none' : 'block';
  });

  sendBtn.addEventListener('click', async function () {
    var key = keyInput.value.trim();
    statusEl.style.color = '#333';
    statusEl.textContent = 'Sending...';

    var channel = window.NOTIFY_UTILS.defaultChannelName();
    var eventName = window.NOTIFY_UTILS.defaultEventName();

    var payload = [{
      name: eventName,
      data: {
        title: document.title,
        message: window.location.href
      }
    }];

    try {
      var url = 'https://rest.ably.io/channels/' + encodeURIComponent(channel) + '/messages';
      var res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Authorization': 'Basic ' + btoa(key)
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        statusEl.style.color = 'green';
        statusEl.textContent = 'Shared successfully.';
        // keep popup visible briefly then hide
        setTimeout(function () { popupEl.style.display = 'none'; statusEl.textContent = ''; }, 1200);
      } else {
        var txt = await res.text().catch(function(){ return res.statusText; });
        statusEl.style.color = 'red';
        statusEl.textContent = 'Share failed: ' + res.status + ' ' + (txt || res.statusText);
      }
    } catch (err) {
      statusEl.style.color = 'red';
      statusEl.textContent = 'Error: ' + (err && err.message ? err.message : String(err));
    }
  });
});
