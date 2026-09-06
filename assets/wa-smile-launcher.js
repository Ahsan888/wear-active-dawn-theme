/**
 * Wear Active custom code start — wa-smile-launcher.js
 * Compact Smile lite launcher on mobile and lift it above sticky ATC.
 */
(function () {
  const MOBILE_QUERY = window.matchMedia('(max-width: 749px)');
  const LITE_FRAME_SELECTOR = '#smile-lite-launcher-frame';
  const STYLE_ID = 'wa-smile-launcher-compact';
  let launcherObserver;

  function isMobile() {
    return MOBILE_QUERY.matches;
  }

  function syncLift() {
    const root = document.documentElement;
    const cartDrawerOpen = Boolean(document.querySelector('cart-drawer.active'));
    const cartHasItems = document.body.classList.contains('template-cart') &&
      !document.getElementById('main-cart-footer')?.classList.contains('is-empty');
    const shouldLift =
      isMobile() && (Boolean(document.querySelector('.wa-sticky-atc--visible')) || cartHasItems);

    if (cartDrawerOpen) root.dataset.waSmileHidden = 'cart-drawer';
    else delete root.dataset.waSmileHidden;

    if (shouldLift && !cartDrawerOpen) {
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
    if (!isMobile()) return false;

    const launchers = document.querySelectorAll(LITE_FRAME_SELECTOR);
    launchers.forEach(setupLiteIframe);
    return launchers.length > 0;
  }

  function observeLiftTargets() {
    const sticky = document.querySelector('wa-sticky-atc');
    const cartFooter = document.getElementById('main-cart-footer');
    const cartDrawer = document.querySelector('cart-drawer');

    syncLift();

    if (sticky) {
      new MutationObserver(syncLift).observe(sticky, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    if (cartFooter) {
      new MutationObserver(syncLift).observe(cartFooter, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }

    if (cartDrawer) {
      new MutationObserver(syncLift).observe(cartDrawer, {
        attributes: true,
        attributeFilter: ['class'],
      });
    }
  }

  function observeSmileInjection() {
    if (!isMobile() || launcherObserver) return;
    if (scanForLaunchers()) return;

    launcherObserver = new MutationObserver(() => {
      if (!scanForLaunchers()) return;
      launcherObserver.disconnect();
      launcherObserver = null;
    });
    launcherObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  function stopObservingSmileInjection() {
    launcherObserver?.disconnect();
    launcherObserver = null;
  }

  function onViewportChange() {
    syncLift();
    if (isMobile()) observeSmileInjection();
    else stopObservingSmileInjection();
  }

  function init() {
    observeLiftTargets();
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
