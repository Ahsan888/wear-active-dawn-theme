/**
 * Wear Active custom code start — wa-product.js
 * Product template enhancements. Loaded only on product pages via theme.liquid.
 */
function initWaProductPage(root = document) {
  initWaProductFamilyRatingScroll();
  root.querySelectorAll('[data-wa-size-chart]').forEach((container) => {
    if (container.dataset.waSizeChartInitialized === 'true') return;

    const trigger = container.querySelector('[data-wa-size-chart-open]');
    if (!trigger) return;

    const modalId = trigger.getAttribute('aria-controls');
    const modal = modalId ? document.getElementById(modalId) : null;
    if (!modal) return;

    container.dataset.waSizeChartInitialized = 'true';
    relocateSizeGuideTrigger(container, trigger);

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      modal.open(trigger);
    });

    const observer = new MutationObserver(() => syncSizeChartModal(modal, trigger));
    observer.observe(modal, { attributes: true, attributeFilter: ['open'] });
    syncSizeChartModal(modal, trigger);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initWaProductPage(), { once: true });
} else {
  initWaProductPage();
}

document.addEventListener('shopify:section:load', (event) => initWaProductPage(event.target));

/**
 * Scrolls to the Judge.me reviews widget with sticky-header offset.
 */
function initWaProductFamilyRatingScroll() {
  const links = document.querySelectorAll('[data-wa-scroll-reviews]');
  if (!links.length) return;

  const reviewsTarget = findWaProductReviewsTarget();
  if (reviewsTarget && !reviewsTarget.id) {
    reviewsTarget.id = 'wa-product-reviews';
  }

  links.forEach((link) => {
    if (link.dataset.waReviewScrollInitialized === 'true') return;
    link.dataset.waReviewScrollInitialized = 'true';

    link.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToWaProductReviews();
    });
  });
}

/**
 * @returns {HTMLElement | null}
 */
function findWaProductReviewsTarget() {
  const widget =
    document.getElementById('judgeme_product_reviews') ||
    document.querySelector('.jdgm-review-widget, .jdgm-rev-widg, .jdgm-widget');

  return widget?.closest('section.shopify-section') || widget;
}

/**
 * Smooth-scrolls to the product reviews section.
 */
function scrollToWaProductReviews() {
  const target = findWaProductReviewsTarget();
  if (!target) return;

  if (!target.id) {
    target.id = 'wa-product-reviews';
  }

  const header =
    document.querySelector('sticky-header') ||
    document.querySelector('.section-header') ||
    document.querySelector('.shopify-section-group-header-group');
  const headerHeight = header instanceof HTMLElement ? header.offsetHeight : 0;
  const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
}

/**
 * Moves the Size Guide trigger beside the Size variant label when present.
 * @param {HTMLElement} container
 * @param {HTMLButtonElement} trigger
 */
function relocateSizeGuideTrigger(container, trigger) {
  const sizeLegend = findSizeLegend(container);
  if (!sizeLegend) return;
  const sizeInput = sizeLegend.closest('.product-form__input');
  const fitSummary = container.querySelector('[data-wa-size-fit-summary]');

  const action = document.createElement('span');
  action.className = 'wa-size-chart__legend-action';
  action.appendChild(trigger);
  sizeLegend.appendChild(action);

  if (sizeInput && fitSummary) {
    sizeInput.appendChild(fitSummary);
  }

  container.classList.add('wa-size-chart--relocated');
}

/**
 * Syncs ARIA state for the size chart modal.
 * @param {HTMLElement} modal
 * @param {HTMLButtonElement} trigger
 */
function syncSizeChartModal(modal, trigger) {
  const isOpen = modal.hasAttribute('open');
  trigger.setAttribute('aria-expanded', String(isOpen));
  modal.setAttribute('aria-hidden', String(!isOpen));
}

/**
 * Finds the Size option label in the variant picker.
 * @param {HTMLElement} container
 * @returns {HTMLElement | undefined}
 */
function findSizeLegend(container) {
  const productInfo = container.closest('.product__info-container') || document;
  const labels = productInfo.querySelectorAll(
    '.product-form__input .form__label, .product-form__input legend.form__label'
  );

  return [...labels].find((element) => {
    const labelText = element.textContent.replace(/:.*$/, '').trim();
    return /^size$/i.test(labelText);
  });
}
