(function() {
  'use strict';

  const ANALYTICS_ENDPOINT = 'http://localhost:3000/api/hit';
  const WEBSITE_ID = 1; // Replace with dynamic ID if serving multiple sites

  function sendPageview() {
    const urlParams = new URLSearchParams(window.location.search);
    const payload = {
      website_id: WEBSITE_ID,
      url: window.location.href,
      referrer: document.referrer,
      language: navigator.language || navigator.userLanguage || '',
      screen_width: window.screen.width || 0,
      screen_height: window.screen.height || 0,
      utm_source: urlParams.get('utm_source') || '',
      utm_medium: urlParams.get('utm_medium') || '',
      utm_campaign: urlParams.get('utm_campaign') || ''
    };

    // Use sendBeacon if available, it's non-blocking and guarantees delivery on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ANALYTICS_ENDPOINT, JSON.stringify(payload));
    } else {
      // Fallback to fetch for older browsers
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    }
  }

  // 1. Track initial page load
  sendPageview();

  // 2. Track Single Page App (SPA) navigations
  // Override pushState and replaceState to detect route changes without full reloads
  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    sendPageview();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    sendPageview();
  };

  // 3. Track back/forward button navigations
  window.addEventListener('popstate', sendPageview);

})();
