/**
 * Wear Active custom code start — wa-bundle-save.js
 * Syncs Bundle & Save row selection with the PDP quantity input.
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-wa-bundle-save]').forEach(initBundleSave);
});

/**
 * @param {HTMLElement} root
 */
function initBundleSave(root) {
  const sectionId = root.dataset.sectionId;
  if (!sectionId) return;

  const quantityInput = document.getElementById(`Quantity-${sectionId}`);
  if (!quantityInput) return;

  const options = [...root.querySelectorAll('[data-quantity]')];
  if (!options.length) return;

  const bundleQuantities = options.map((option) => parseInt(option.dataset.quantity, 10));

  /**
   * @param {number | null} quantity
   */
  function setSelected(quantity) {
    options.forEach((option) => {
      const optionQuantity = parseInt(option.dataset.quantity, 10);
      const isSelected = quantity !== null && optionQuantity === quantity;
      option.classList.toggle('wa-bundle-save__option--selected', isSelected);
      option.setAttribute('aria-checked', String(isSelected));
    });
  }

  function syncFromQuantityInput() {
    const value = parseInt(quantityInput.value, 10);
    if (bundleQuantities.includes(value)) {
      setSelected(value);
    } else {
      setSelected(null);
    }
  }

  /**
   * @param {number} quantity
   */
  function setQuantity(quantity) {
    const min = parseInt(quantityInput.min, 10) || 1;
    const max = quantityInput.max ? parseInt(quantityInput.max, 10) : null;
    let nextQuantity = quantity;

    if (nextQuantity < min) nextQuantity = min;
    if (max !== null && nextQuantity > max) nextQuantity = max;

    if (quantityInput.value !== String(nextQuantity)) {
      quantityInput.value = String(nextQuantity);
      quantityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setSelected(bundleQuantities.includes(nextQuantity) ? nextQuantity : null);
  }

  options.forEach((option) => {
    option.addEventListener('click', () => {
      setQuantity(parseInt(option.dataset.quantity, 10));
    });
  });

  quantityInput.addEventListener('change', syncFromQuantityInput);
  quantityInput.addEventListener('input', syncFromQuantityInput);

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
      if (String(event?.data?.sectionId) !== String(sectionId)) return;
      requestAnimationFrame(syncFromQuantityInput);
    });
  }

  syncFromQuantityInput();
}
