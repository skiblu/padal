(function () {
  function defaultEventName() {
    var now = new Date();
    var months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var mon = months[now.getMonth()] || 'EVT';
    var day = String(now.getDate()).padStart(2, '0');
    return mon + day;
  }

  function defaultChannelName() {
    return 'padal-notification';
  }

  window.NOTIFY_UTILS = window.NOTIFY_UTILS || {};
  window.NOTIFY_UTILS.defaultEventName = defaultEventName;
  window.NOTIFY_UTILS.defaultChannelName = defaultChannelName;
})();

