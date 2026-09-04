/** Wear Active contextual cart cross-sell. */
if (!customElements.get('wa-cart-complete-look')) {
  customElements.define(
    'wa-cart-complete-look',
    class WaCartCompleteLook extends HTMLElement {
      connectedCallback() {
        if (this.dataset.initialized === 'true') return;
        this.dataset.initialized = 'true';

        this.variantInput = this.querySelector('[data-wa-cart-cross-sell-variant]');
        this.addButton = this.querySelector('[data-wa-cart-cross-sell-add]');
        this.error = this.querySelector('[data-wa-cart-cross-sell-error]');
        this.price = this.querySelector('[data-wa-cart-cross-sell-price]');
        this.addButton?.addEventListener('click', () => this.add());
        this.variantInput?.addEventListener('change', () => this.updatePrice());

        window.waTrackAov?.('cart_recommendation_viewed', this.eventData());
      }

      eventData(extra = {}) {
        return {
          placement: 'cart_drawer',
          product_id: this.dataset.productId,
          product_handle: this.dataset.productHandle,
          product_title: this.dataset.productTitle,
          variant_id: this.variantInput?.value,
          ...extra,
        };
      }

      updatePrice() {
        const selected = this.variantInput?.selectedOptions?.[0];
        if (this.price && selected?.dataset.price) this.price.textContent = selected.dataset.price;
      }

      async add() {
        const variantId = Number(this.variantInput?.value || 0);
        if (!variantId || !this.addButton) return;

        this.setError('');
        this.setLoading(true);
        const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
        const sections = cart?.getSectionsToRender?.().map((section) => section.id) || [];

        try {
          const response = await fetch(window.routes?.cart_add_url || '/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              items: [{ id: variantId, quantity: 1, properties: { _wa_source: 'cart_complete_look' } }],
              sections,
              sections_url: window.location.pathname,
            }),
          });
          const result = await response.json();
          if (!response.ok || result.status) {
            throw new Error(result.description || result.message || 'Could not add this item.');
          }

          window.waTrackAov?.('cart_recommendation_added', this.eventData({ variant_id: variantId }));
          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            await publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'wa-cart-complete-look',
              productVariantId: variantId,
              cartData: result,
            });
          }

          if (cart?.renderContents) {
            cart.setActiveElement?.(this.addButton);
            cart.renderContents(result);
          } else {
            window.location.assign(window.routes?.cart_url || '/cart');
          }
        } catch (error) {
          this.setError(error.message || 'Could not add this item. Please try again.');
        } finally {
          this.setLoading(false);
        }
      }

      setLoading(loading) {
        this.addButton?.toggleAttribute('disabled', loading);
        this.addButton?.querySelector('.loading__spinner')?.classList.toggle('hidden', !loading);
        const label = this.addButton?.querySelector('span:first-child');
        if (label) label.classList.toggle('hidden', loading);
      }

      setError(message) {
        if (!this.error) return;
        this.error.textContent = message;
        this.error.hidden = !message;
      }
    }
  );
}

