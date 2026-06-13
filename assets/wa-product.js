/**
 * Wear Active custom code start — wa-product.js
 * Product template enhancements. Loaded only on product pages via theme.liquid.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-wa-size-chart]').forEach((container) => {
    const trigger = container.querySelector('[data-wa-size-chart-open]');
    if (!trigger) return;

    const modalId = trigger.getAttribute('aria-controls');
    const modal = modalId ? document.getElementById(modalId) : null;
    if (!modal) return;

    relocateSizeGuideTrigger(container, trigger);

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      modal.open(trigger);
    });

    const observer = new MutationObserver(() => syncSizeChartModal(modal, trigger));
    observer.observe(modal, { attributes: true, attributeFilter: ['open'] });
    syncSizeChartModal(modal, trigger);
  });
});

/**
 * Moves the Size Guide trigger beside the Size variant label when present.
 * @param {HTMLElement} container
 * @param {HTMLButtonElement} trigger
 */
function relocateSizeGuideTrigger(container, trigger) {
  const sizeLegend = findSizeLegend();
  if (!sizeLegend) return;

  const action = document.createElement('span');
  action.className = 'wa-size-chart__legend-action';
  action.appendChild(trigger);
  sizeLegend.appendChild(action);
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
 * @returns {HTMLElement | undefined}
 */
function findSizeLegend() {
  const labels = document.querySelectorAll(
    '.product-form__input .form__label, .product-form__input legend.form__label'
  );

  return [...labels].find((element) => {
    const labelText = element.textContent.replace(/:.*$/, '').trim();
    return /^size$/i.test(labelText);
  });
}
