/**
 * Wear Active custom code start — wa-card-swatch-preview.js
 * Desktop-only sibling color swatch image preview on product cards.
 */
(function () {
  const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';

  const getActiveSwatchLink = (card) =>
    card.querySelector(
      '.wa-linked-colors--card .wa-color-swatch__link[data-wa-swatch-preview-src]:hover, .wa-linked-colors--card .wa-color-swatch__link[data-wa-swatch-preview-src]:focus'
    );

  const applyPreviewImage = (previewImg, link) => {
    const nextSrc = link.dataset.waSwatchPreviewSrc;
    if (!nextSrc || previewImg.dataset.waActivePreviewSrc === nextSrc) return;

    previewImg.src = nextSrc;
    previewImg.srcset = link.dataset.waSwatchPreviewSrcset || '';
    previewImg.sizes = link.dataset.waSwatchPreviewSizes || '';
    previewImg.alt = link.dataset.waSwatchPreviewAlt || '';
    previewImg.dataset.waActivePreviewSrc = nextSrc;
  };

  const showPreview = (card, link) => {
    const media = card.querySelector('.wa-product-card__media');
    const previewImg = card.querySelector('.wa-product-card__image--swatch-preview');
    if (!media || !previewImg || !link) return;

    applyPreviewImage(previewImg, link);
    media.classList.add('wa-product-card__media--swatch-preview');
    previewImg.hidden = false;
  };

  const hidePreview = (card) => {
    const media = card.querySelector('.wa-product-card__media');
    const previewImg = card.querySelector('.wa-product-card__image--swatch-preview');
    if (!media || !previewImg) return;

    media.classList.remove('wa-product-card__media--swatch-preview');
    previewImg.hidden = true;
  };

  const scheduleHide = (card) => {
    requestAnimationFrame(() => {
      if (!getActiveSwatchLink(card)) hidePreview(card);
    });
  };

  const initCard = (card) => {
    if (card.dataset.waSwatchPreviewInitialized === 'true') return;

    const links = card.querySelectorAll(
      '.wa-linked-colors--card .wa-color-swatch__link[data-wa-swatch-preview-src]'
    );
    if (!links.length || !card.querySelector('.wa-product-card__image--swatch-preview')) return;

    card.dataset.waSwatchPreviewInitialized = 'true';

    links.forEach((link) => {
      link.addEventListener('mouseenter', () => showPreview(card, link));
      link.addEventListener('mouseleave', () => scheduleHide(card));
      link.addEventListener('focus', () => showPreview(card, link));
      link.addEventListener('blur', () => scheduleHide(card));
    });
  };

  const init = (root = document) => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) return;
    root.querySelectorAll('.wa-product-card').forEach(initCard);
  };

  window.WA = window.WA || {};
  window.WA.initCardSwatchPreview = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }

  document.addEventListener('wa:products-appended', (event) => {
    init(event.detail?.container || document);
  });
})();
