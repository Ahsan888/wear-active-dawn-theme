/**
 * Wear Active custom code start — wa-smile-launcher.js
 * Compact Smile lite launcher on mobile and lift it above sticky ATC.
 */
(function () {
  const MOBILE_QUERY = window.matchMedia('(max-width: 749px)');
  const LITE_FRAME_SELECTOR = '#smile-lite-launcher-frame';
  const STYLE_ID = 'wa-smile-launcher-compact';

  function isMobile() {
    return MOBILE_QUERY.matches;
  }

  function syncLift() {
    const root = document.documentElement;
    const shouldLift = isMobile() && Boolean(document.querySelector('.wa-sticky-atc--visible'));

    if (shouldLift) {
      root.dataset.waSmileLift = 'sticky-atc';
      return;
    }

    delete root.dataset.waSmileLift;
  }

  function injectIframeStyles(iframe) {
    const doc = iframe.contentDocument;
    if (!doc || doc.getElementById(STYLE_ID)) return;

    const style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      button span {
        display: none !important;
      }

      button {
        width: 4.8rem !important;
        height: 4.8rem !important;
        min-width: 4.4rem !important;
        min-height: 4.4rem !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
      }

      button img {
        width: 2rem !important;
        height: 2rem !important;
        margin: 0 !important;
      }
    `;
    doc.head.appendChild(style);
    iframe.dataset.waSmileCompact = 'true';
  }

  function setupLiteIframe(iframe) {
    if (!iframe || iframe.dataset.waSmileBound === 'true') return;

    iframe.dataset.waSmileBound = 'true';

    const onReady = () => {
      if (!isMobile()) return;
      injectIframeStyles(iframe);
    };

    if (iframe.contentDocument?.querySelector('button')) {
      onReady();
      return;
    }

    iframe.addEventListener('load', onReady);
  }

  function scanForLaunchers() {
    if (!isMobile()) return;

    document.querySelectorAll(LITE_FRAME_SELECTOR).forEach(setupLiteIframe);
  }

  function observeStickyAtc() {
    const sticky = document.querySelector('wa-sticky-atc');
    if (!sticky) return;

    syncLift();
    new MutationObserver(syncLift).observe(sticky, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function observeSmileInjection() {
    scanForLaunchers();

    new MutationObserver(scanForLaunchers).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function onViewportChange() {
    syncLift();
    scanForLaunchers();
  }

  function init() {
    observeStickyAtc();
    observeSmileInjection();
    syncLift();
    MOBILE_QUERY.addEventListener('change', onViewportChange);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
