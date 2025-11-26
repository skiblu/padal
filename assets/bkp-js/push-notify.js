document.getElementById("notify-send").addEventListener("click", async function () {
    var statusEl = document.getElementById("notify-status");
    statusEl.style.color = 'black';
    statusEl.textContent = 'Publishing...';

    var notifyKey = document.getElementById("notify-key").value.trim();
    var channel = document.getElementById("notify-channel").value.trim() || 'padal-notification';
    var eventName = document.getElementById("notify-event").value.trim() || '';
    var title = document.getElementById("notify-title").value.trim();
    var message = document.getElementById("notify-message").value.trim();

    if (!notifyKey) {
        statusEl.style.color = 'red';
        statusEl.textContent = 'Notify Key is required.';
        return;
    }
    if (!title && !message) {
        statusEl.style.color = 'red';
        statusEl.textContent = 'Provide at least a title or message.';
        return;
    }

    // If eventName blank, compute default MONTH+DAY (e.g. NOV22)
    if (!eventName) {
      var now = new Date();
      var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      var mon = months[now.getMonth()] || 'EVT';
      var day = String(now.getDate()).padStart(2, '0');
      eventName = mon + day;
    }

    // Build payload: Ably accepts an array of messages
    var payload = [{
      name: eventName,
      data: { title: title, message: message }
    }];

    try {
        // Ably REST publish URL
        var url = 'https://rest.ably.io/channels/' + encodeURIComponent(channel) + '/messages';

        var res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Authorization': 'Basic ' + btoa(notifyKey)
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            statusEl.style.color = 'green';
            statusEl.textContent = 'Published successfully.';
            try { localStorage.setItem('allowSharing', 'true'); } catch (e) { /* ignore storage errors */ }

            // clear fields (except notifyKey)
            document.getElementById("notify-title").value = '';
            document.getElementById("notify-message").value = '';
        } else {
            var txt = await res.text().catch(()=>res.statusText);
            statusEl.style.color = 'red';
            statusEl.textContent = 'Publish failed: ' + res.status + ' ' + (txt || res.statusText);
        }
    } catch (err) {
        statusEl.style.color = 'red';
        statusEl.textContent = 'Error: ' + (err && err.message ? err.message : String(err));
    }
});
