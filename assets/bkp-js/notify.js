(function () {
  // storage key for timezone
  var TZ_STORAGE_KEY = 'padal_timezone';

  function saveTimezone(tz) {
    try {
      if (typeof tz === 'string') localStorage.setItem(TZ_STORAGE_KEY, tz);
    } catch (e) { /* ignore storage errors */ }
  }

  function getStoredTimezone() {
    try { return localStorage.getItem(TZ_STORAGE_KEY) || ''; } catch (e) { return ''; }
  }

  function defaultEventName() {
    var now = new Date();
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var mon = months[now.getMonth()] || 'EVT';
    var day = String(now.getDate()).padStart(2, '0');

    var tzAbbr = '';
    try {
      // Prefer the short timeZoneName if available (e.g. "CST", "IST")
      var parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now);
      var tzPart = parts.find(function (p) { return p.type === 'timeZoneName'; });
      if (tzPart && tzPart.value) {
        tzAbbr = tzPart.value.replace(/\s+/g, '');
        tzAbbr = tzAbbr.replace(/[()]/g, ''); // strip parentheses if present
      }
    } catch (e) {
      tzAbbr = '';
    }

    // persist the timezone abbreviation for other scripts
    saveTimezone(tzAbbr);

    return mon + day + tzAbbr;
  }

  function defaultChannelName() {
    return 'padal-notification';
  }

  window.NOTIFY_UTILS = window.NOTIFY_UTILS || {};
  window.NOTIFY_UTILS.defaultEventName = defaultEventName;
  window.NOTIFY_UTILS.defaultChannelName = defaultChannelName;
  window.NOTIFY_UTILS.TZ_STORAGE_KEY = TZ_STORAGE_KEY;
  window.NOTIFY_UTILS.saveTimezone = saveTimezone;
  window.NOTIFY_UTILS.getStoredTimezone = getStoredTimezone;
})();
