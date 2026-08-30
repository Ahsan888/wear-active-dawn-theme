/**
 * Wear Active custom code start — wa-product-reviews.js
 * Hides duplicate Judge.me header stats after the family summary renders.
 */
(function () {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWaProductReviewsUi);
  } else {
    initWaProductReviewsUi();
  }
})();

/**
 * Reads family review data injected by wa-product-family-reviews-data.liquid.
 * @returns {object | null}
 */
function readWaProductFamilyReviewsData() {
  const dataEl = document.getElementById('WaProductFamilyReviewsData');
  if (!dataEl) return null;

  try {
    return JSON.parse(dataEl.textContent);
  } catch (error) {
    return null;
  }
}

/**
 * @returns {HTMLElement | null}
 */
function findWaJudgeMeReviewWidget() {
  const container = document.querySelector('[data-wa-product-reviews-widget]');
  return (
    container?.querySelector('#judgeme_product_reviews') ||
    container?.querySelector('.jdgm-review-widget') ||
    document.getElementById('judgeme_product_reviews')
  );
}

/**
 * Hides Judge.me per-product summary/header stats; family summary is rendered in Liquid.
 * @param {HTMLElement} widget
 */
function hideWaJudgeMeNativeSummary(widget) {
  widget
    .querySelectorAll(
      [
        '.jdgm-rev-widg__summary',
        '.jdgm-rev-widg__summary-text',
        '.jdgm-histogram',
        '.jdgm-rev-widg__title',
        '.jdgm-ssr-rating-distribution',
        '.jdgm-ssr-ai-content',
        '.jm-review-widget-minimal-header__title',
        '.jm-average-rating-display',
        '.jm-review-widget__header .jm-average-rating-display',
      ].join(', ')
    )
    .forEach((node) => {
      node.setAttribute('hidden', 'hidden');
      node.style.display = 'none';
    });
}

/**
 * Waits for the Judge.me review widget to finish its initial render.
 * @returns {Promise<HTMLElement | null>}
 */
function waitForWaJudgeMeWidget() {
  const existing = findWaJudgeMeReviewWidget();
  if (existing?.querySelector('.jm-review-item, .jdgm-rev, .jdgm-write-rev-link, .jm-action-buttons')) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve) => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      const widget = findWaJudgeMeReviewWidget();
      if (widget?.querySelector('.jm-review-item, .jdgm-rev, .jdgm-write-rev-link, .jm-action-buttons')) {
        window.clearInterval(timer);
        resolve(widget);
        return;
      }

      if (attempts >= 80) {
        window.clearInterval(timer);
        resolve(findWaJudgeMeReviewWidget());
      }
    }, 250);
  });
}

/**
 * Keeps the family summary authoritative if Judge.me re-renders its header.
 * @param {HTMLElement} widget
 */
function observeWaJudgeMeWidget(widget) {
  if (widget.dataset.waFamilyReviewsObserved === 'true') return;
  widget.dataset.waFamilyReviewsObserved = 'true';

  const observer = new MutationObserver(() => {
    hideWaJudgeMeNativeSummary(widget);
  });

  observer.observe(widget, { childList: true, subtree: true });
}

/**
 * Initializes post-render UI cleanup for the reviews section.
 */
async function initWaProductReviewsUi() {
  const data = readWaProductFamilyReviewsData();
  if (!data?.totalReviews) return;

  const widget = await waitForWaJudgeMeWidget();
  if (!widget) return;

  hideWaJudgeMeNativeSummary(widget);
  observeWaJudgeMeWidget(widget);

  window.setTimeout(() => hideWaJudgeMeNativeSummary(widget), 1200);
}
