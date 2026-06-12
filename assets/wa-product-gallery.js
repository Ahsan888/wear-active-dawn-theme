/**
 * Wear Active custom code start — wa-product-gallery.js
 * Lightweight PDP gallery enhancements. Does not replace Dawn media-gallery.js.
 */
(function () {
  const initGallery = (gallery) => {
    const viewer = gallery.querySelector('[id^="GalleryViewer-"]');
    const progress = gallery.querySelector('.wa-product-gallery__progress');
    if (!viewer) return;

    const syncProgress = (currentPage, pageCount) => {
      if (!progress || !currentPage || !pageCount) return;
      progress.style.setProperty('--wa-gallery-index', currentPage);
      progress.style.setProperty('--wa-gallery-count', pageCount);
    };

    const readCounter = () => {
      const current = viewer.querySelector('.slider-counter--current')?.textContent?.trim();
      const total = viewer.querySelector('.slider-counter--total')?.textContent?.trim();
      if (current && total) syncProgress(current, total);
    };

    viewer.addEventListener('slideChanged', (event) => {
      const { currentPage, pageCount } = event.detail || {};
      syncProgress(currentPage, pageCount);
    });

    readCounter();
  };

  const init = () => {
    document.querySelectorAll('media-gallery.wa-product-gallery').forEach(initGallery);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
