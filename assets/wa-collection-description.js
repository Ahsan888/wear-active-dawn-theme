/**
 * Wear Active custom code start — wa-collection-description.js
 * Accessible read more / less for collection descriptions.
 */
(function () {
  const ROOT_SELECTOR = '[data-wa-collection-description]';
  const TOGGLE_SELECTOR = '[data-wa-collection-description-toggle]';
  const VIEWPORT_SELECTOR = '.wa-collection-description__viewport';
  const CONTENT_SELECTOR = '.wa-collection-description__content';
  const MORE_SELECTOR = '[data-wa-collection-description-more]';
  const LESS_SELECTOR = '[data-wa-collection-description-less]';
  const EXPANDED_CLASS = 'wa-collection-description--expanded';
  const STATIC_CLASS = 'wa-collection-description--static';

  function measureHeights(content, viewport) {
    viewport.style.maxHeight = 'none';
    content.classList.remove('wa-collection-description__content--clamped');

    const fullHeight = content.scrollHeight;

    content.classList.add('wa-collection-description__content--clamped');
    viewport.style.maxHeight = '';
    const collapsedHeight = viewport.scrollHeight;

    return { collapsedHeight, fullHeight };
  }

  function initDescription(root) {
    if (root.classList.contains(STATIC_CLASS)) return;

    const toggle = root.querySelector(TOGGLE_SELECTOR);
    const viewport = root.querySelector(VIEWPORT_SELECTOR);
    const content = root.querySelector(CONTENT_SELECTOR);

    if (!toggle || !viewport || !content) return;

    const moreLabel = toggle.querySelector(MORE_SELECTOR);
    const lessLabel = toggle.querySelector(LESS_SELECTOR);
    let heights = measureHeights(content, viewport);

    if (heights.fullHeight <= heights.collapsedHeight + 1) {
      toggle.hidden = true;
      root.classList.add(STATIC_CLASS);
      content.classList.remove('wa-collection-description__content--clamped');
      return;
    }

    viewport.style.setProperty('--wa-collection-desc-collapsed', `${heights.collapsedHeight}px`);
    viewport.style.setProperty('--wa-collection-desc-expanded', `${heights.fullHeight}px`);
    viewport.style.maxHeight = `${heights.collapsedHeight}px`;

    const setExpanded = (expanded) => {
      root.classList.toggle(EXPANDED_CLASS, expanded);
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      viewport.style.maxHeight = expanded
        ? `${heights.fullHeight}px`
        : `${heights.collapsedHeight}px`;

      if (moreLabel) moreLabel.hidden = expanded;
      if (lessLabel) lessLabel.hidden = !expanded;
    };

    toggle.addEventListener('click', () => {
      setExpanded(!root.classList.contains(EXPANDED_CLASS));
    });

    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (root.classList.contains(EXPANDED_CLASS)) return;
        heights = measureHeights(content, viewport);
        if (heights.fullHeight <= heights.collapsedHeight + 1) {
          toggle.hidden = true;
          root.classList.add(STATIC_CLASS);
          content.classList.remove('wa-collection-description__content--clamped');
          viewport.style.maxHeight = 'none';
          return;
        }
        viewport.style.setProperty('--wa-collection-desc-collapsed', `${heights.collapsedHeight}px`);
        viewport.style.setProperty('--wa-collection-desc-expanded', `${heights.fullHeight}px`);
        viewport.style.maxHeight = `${heights.collapsedHeight}px`;
      }, 150);
    });
  }

  function init() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initDescription);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('wa-collection-description--reduce-motion');
  }
})();
