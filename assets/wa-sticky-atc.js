/**
 * Wear Active custom code start — wa-sticky-atc.js
 * Sticky Add to Cart bar with IntersectionObserver visibility.
 */
class WaStickyAtc extends HTMLElement {
  constructor() {
    super();
    this.scrolledPast = false;
    this.drawerOpen = false;
    this.onIntersect = this.onIntersect.bind(this);
    this.onStickySubmit = this.onStickySubmit.bind(this);
    this.onVariantChange = this.onVariantChange.bind(this);
    this.syncButtonState = this.syncButtonState.bind(this);
    this.onDrawerClassChange = this.onDrawerClassChange.bind(this);
    this.onDrawerInnerTransitionEnd = this.onDrawerInnerTransitionEnd.bind(this);
    this.onDrawerVisibilityTransitionEnd = this.onDrawerVisibilityTransitionEnd.bind(this);
    this.completeDrawerClose = this.completeDrawerClose.bind(this);
  }

  connectedCallback() {
    this.sectionId = this.dataset.sectionId;
    this.sentinel = document.querySelector(`[data-wa-sticky-atc-sentinel="${this.sectionId}"]`);
    this.mainButton = document.getElementById(`ProductSubmitButton-${this.sectionId}`);
    this.mainPrice = document.getElementById(`price-${this.sectionId}`);
    this.stickyPrice = document.getElementById(`wa-sticky-atc-price-${this.sectionId}`);
    this.stickyButton = document.getElementById(`wa-sticky-atc-submit-${this.sectionId}`);
    this.stickyButtonText = this.stickyButton?.querySelector('.wa-sticky-atc__submit-text');
    this.stickyImage = document.getElementById(`wa-sticky-atc-image-${this.sectionId}`);
    this.stickySize = document.getElementById(`wa-sticky-atc-size-${this.sectionId}`);

    if (!this.sentinel || !this.mainButton || !this.stickyButton) return;

    this.intersectionObserver = new IntersectionObserver(this.onIntersect, {
      root: null,
      threshold: 0,
    });
    this.intersectionObserver.observe(this.sentinel);

    this.stickyButton.addEventListener('click', this.onStickySubmit);
    this.initCartDrawer();

    this.buttonObserver = new MutationObserver(this.syncButtonState);
    this.buttonObserver.observe(this.mainButton, {
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'class'],
    });

    if (this.mainPrice && this.stickyPrice) {
      this.priceObserver = new MutationObserver(this.syncButtonState);
      this.priceObserver.observe(this.mainPrice, { childList: true, subtree: true });
    }

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      this.variantUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange);
    }

    this.syncButtonState();
  }

  disconnectedCallback() {
    this.intersectionObserver?.disconnect();
    this.buttonObserver?.disconnect();
    this.priceObserver?.disconnect();
    this.drawerObserver?.disconnect();
    this.clearDrawerCloseListener();
    this.stickyButton?.removeEventListener('click', this.onStickySubmit);
    this.variantUnsubscriber?.();
  }

  initCartDrawer() {
    this.cartDrawer = document.querySelector('cart-drawer');
    if (!this.cartDrawer) return;

    this.drawerInner = this.cartDrawer.querySelector('.drawer__inner');
    this.drawerOpen = this.cartDrawer.classList.contains('active');

    this.drawerObserver = new MutationObserver(this.onDrawerClassChange);
    this.drawerObserver.observe(this.cartDrawer, { attributes: true, attributeFilter: ['class'] });

    if (this.drawerOpen) this.applyVisibility();
  }

  onDrawerClassChange() {
    const isActive = this.cartDrawer.classList.contains('active');

    if (isActive) {
      this.drawerOpen = true;
      this.clearDrawerCloseListener();
      this.applyVisibility();
      return;
    }

    if (!this.drawerOpen) return;
    this.listenForDrawerClose();
  }

  listenForDrawerClose() {
    if (!this.drawerInner) {
      this.drawerOpen = false;
      this.applyVisibility();
      return;
    }

    this.clearDrawerCloseListener();
    this.drawerCloseReady = { transform: false, visibility: false };

    this.drawerInner?.addEventListener('transitionend', this.onDrawerInnerTransitionEnd);
    this.cartDrawer?.addEventListener('transitionend', this.onDrawerVisibilityTransitionEnd);

    this.drawerCloseFallback = window.setTimeout(() => this.completeDrawerClose(true), 350);
  }

  onDrawerInnerTransitionEnd(event) {
    if (event.target !== this.drawerInner || event.propertyName !== 'transform') return;
    this.drawerCloseReady.transform = true;
    this.completeDrawerClose();
  }

  onDrawerVisibilityTransitionEnd(event) {
    if (event.target !== this.cartDrawer || event.propertyName !== 'visibility') return;
    this.drawerCloseReady.visibility = true;
    this.completeDrawerClose();
  }

  completeDrawerClose(force = false) {
    if (!this.drawerOpen || this.cartDrawer?.classList.contains('active')) return;

    if (!force) {
      const drawerCloseReady = this.drawerCloseReady || {};
      const { transform, visibility } = drawerCloseReady;
      if (!transform && !visibility) return;
    }

    this.drawerOpen = false;
    this.clearDrawerCloseListener();
    this.applyVisibility();
  }

  clearDrawerCloseListener() {
    this.drawerInner?.removeEventListener('transitionend', this.onDrawerInnerTransitionEnd);
    this.cartDrawer?.removeEventListener('transitionend', this.onDrawerVisibilityTransitionEnd);

    if (this.drawerCloseFallback) {
      window.clearTimeout(this.drawerCloseFallback);
      this.drawerCloseFallback = null;
    }
  }

  onIntersect([entry]) {
    this.scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    this.applyVisibility();
  }

  applyVisibility() {
    const shouldShow = this.scrolledPast && !this.drawerOpen;
    const wasDrawerHidden = this.classList.contains('wa-sticky-atc--drawer-hidden');

    this.classList.toggle('wa-sticky-atc--drawer-hidden', this.drawerOpen);

    if (shouldShow) {
      if (wasDrawerHidden) {
        this.classList.remove('wa-sticky-atc--visible');
        requestAnimationFrame(() => {
          this.classList.add('wa-sticky-atc--visible');
        });
      } else {
        this.classList.add('wa-sticky-atc--visible');
      }

      this.setAttribute('aria-hidden', 'false');
      this.removeAttribute('inert');
      return;
    }

    this.classList.remove('wa-sticky-atc--visible');
    this.setAttribute('aria-hidden', 'true');
    this.setAttribute('inert', '');
  }

  onStickySubmit() {
    if (!this.mainButton || this.mainButton.disabled || this.mainButton.getAttribute('aria-disabled') === 'true') {
      return;
    }

    this.mainButton.click();
    this.syncButtonState();
  }

  onVariantChange(event) {
    if (String(event?.data?.sectionId) !== String(this.sectionId)) return;

    const variant = event?.data?.variant;
    if (variant) this.updateImage(variant);

    requestAnimationFrame(() => {
      this.updateSize();
      this.syncButtonState();
    });
  }

  updateImage(variant) {
    if (!this.stickyImage) return;

    const preview = variant?.featured_media?.preview_image || variant?.featured_image;
    if (!preview?.src) return;

    const separator = preview.src.includes('?') ? '&' : '?';
    this.stickyImage.src = `${preview.src}${separator}width=140`;
    if (preview.alt) this.stickyImage.alt = preview.alt;
  }

  getSelectedSize() {
    const variantSelects = document.getElementById(`variant-selects-${this.sectionId}`);
    if (!variantSelects) return '';

    const inputs = variantSelects.querySelectorAll('.product-form__input');
    for (const input of inputs) {
      const label = input.querySelector('.form__label, legend');
      if (!label) continue;

      const labelText = label.textContent.replace(/:$/, '').trim().toLowerCase();
      if (labelText !== 'size') continue;

      const selectedValue = input.querySelector('[data-selected-value]');
      if (selectedValue?.textContent?.trim()) return selectedValue.textContent.trim();

      const checkedInput = input.querySelector('input[type="radio"]:checked');
      if (checkedInput?.value) return checkedInput.value;

      const select = input.querySelector('select');
      if (select?.selectedOptions?.[0]) return select.selectedOptions[0].text.trim();
    }

    return '';
  }

  updateSize() {
    if (!this.stickySize) return;

    const size = this.getSelectedSize();
    if (size) {
      this.stickySize.textContent = size;
      this.stickySize.hidden = false;
    } else {
      this.stickySize.textContent = '';
      this.stickySize.hidden = true;
    }
  }

  syncButtonState() {
    if (!this.mainButton || !this.stickyButton) return;

    const isDisabled = this.mainButton.disabled || this.mainButton.getAttribute('aria-disabled') === 'true';
    this.stickyButton.disabled = isDisabled;
    this.stickyButton.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');

    const mainLabel = this.mainButton.querySelector('span:not(.sold-out-message):not(.loading__spinner)')?.textContent?.trim();
    if (mainLabel && this.stickyButtonText) {
      this.stickyButtonText.textContent = mainLabel;
      this.stickyButton.setAttribute('aria-label', mainLabel);
    }

    const isLoading = this.mainButton.classList.contains('loading');
    this.stickyButton.classList.toggle('loading', isLoading);
    this.stickyButton.toggleAttribute('aria-busy', isLoading);

    const mainSpinner = this.mainButton.querySelector('.loading__spinner');
    const stickySpinner = this.stickyButton.querySelector('.loading__spinner');
    if (mainSpinner && stickySpinner) {
      stickySpinner.classList.toggle('hidden', mainSpinner.classList.contains('hidden'));
    }

    if (this.mainPrice && this.stickyPrice && this.mainPrice.innerHTML !== this.stickyPrice.innerHTML) {
      this.stickyPrice.innerHTML = this.mainPrice.innerHTML;
    }

    this.updateSize();
  }
}

if (!customElements.get('wa-sticky-atc')) {
  customElements.define('wa-sticky-atc', WaStickyAtc);
}
