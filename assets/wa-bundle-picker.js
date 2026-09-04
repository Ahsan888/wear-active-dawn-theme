/**
 * Wear Active margin-safe mix-and-match bundle picker.
 * Shopify automatic discounts remain the source of truth for the saving.
 */
if (!customElements.get('wa-bundle-picker')) {
  customElements.define(
    'wa-bundle-picker',
    class WaBundlePicker extends HTMLElement {
      connectedCallback() {
        if (this.dataset.initialized === 'true') return;
        this.dataset.initialized = 'true';

        this.form = document.getElementById(this.dataset.formId);
        this.submitButton = this.form?.querySelector('[type="submit"]');
        this.submitLabel = this.submitButton?.querySelector('span');
        this.selection = this.querySelector('[data-wa-bundle-selection]');
        this.extraSlots = this.querySelector('[data-wa-bundle-extra-slots]');
        this.summary = this.querySelector('[data-wa-bundle-summary]');
        this.error = this.querySelector('[data-wa-bundle-error]');
        this.dialog = this.querySelector('[data-wa-bundle-dialog]');
        this.productGrid = this.querySelector('[data-wa-bundle-product-grid]');
        this.search = this.querySelector('[data-wa-bundle-search]');
        this.emptyState = this.querySelector('[data-wa-bundle-empty]');
        this.quantity = 1;

        this.currentProduct = this.parseJson('[data-wa-current-product]', null);
        const collectionProducts = this.parseJson('[data-wa-bundle-products]', []);
        const allProducts = this.uniqueProducts([this.currentProduct, ...collectionProducts].filter(Boolean));
        const currentAudiences = new Set(this.currentProduct?.audiences || []);
        this.products = allProducts.filter((product) => {
          if (currentAudiences.size === 0) return String(product.id) === String(this.currentProduct?.id);
          return (product.audiences || []).some((audience) => currentAudiences.has(audience));
        });
        if (!this.form || !this.submitButton || !this.currentProduct || this.products.length === 0) return;

        this.originalSubmitLabel = this.submitLabel?.textContent.trim() || 'Add to cart';
        this.querySelectorAll('[data-wa-bundle-tier]').forEach((button) => {
          button.addEventListener('click', () => this.selectTier(Number(button.dataset.waBundleTier || 1)));
        });
        this.querySelector('[data-wa-bundle-dialog-close]')?.addEventListener('click', () => this.closeProductDialog());
        this.dialog?.addEventListener('click', (event) => {
          if (event.target === this.dialog) this.closeProductDialog();
        });
        this.search?.addEventListener('input', () => this.filterProductCards());

        this.form.addEventListener('submit', (event) => this.handleSubmit(event), true);
        if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
          this.variantUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
            const sectionId = this.closest('product-info')?.dataset.section;
            if (!data?.variant || String(data.sectionId) !== String(sectionId)) return;
            this.dataset.currentVariantId = String(data.variant.id);
            this.syncCurrentVariant();
          });
        }

        this.syncCurrentVariant();
        this.selectTier(1);
      }

      disconnectedCallback() {
        this.variantUnsubscriber?.();
      }

      parseJson(selector, fallback) {
        try {
          return JSON.parse(this.querySelector(selector)?.textContent || '') || fallback;
        } catch (_error) {
          return fallback;
        }
      }

      uniqueProducts(products) {
        const seen = new Set();
        return products.filter((product) => {
          const key = String(product.id);
          if (seen.has(key)) return false;
          seen.add(key);
          return Array.isArray(product.variants) && product.variants.some((variant) => variant.available);
        });
      }

      currentVariant() {
        const id = String(this.form?.querySelector('[name="id"]')?.value || this.dataset.currentVariantId || '');
        return (
          this.currentProduct.variants.find((variant) => String(variant.id) === id) ||
          this.currentProduct.variants.find((variant) => variant.available)
        );
      }

      syncCurrentVariant() {
        const variant = this.currentVariant();
        if (!variant) return;
        this.dataset.currentVariantId = String(variant.id);
        const title = this.querySelector('[data-wa-current-variant-title]');
        if (title) title.textContent = this.variantLabel(this.currentProduct, variant);

        this.extraSlots?.querySelectorAll('[data-wa-bundle-slot]').forEach((slot) => {
          this.populateVariants(slot, slot.dataset.productId, this.variantLabel(this.currentProduct, variant));
        });
        this.refreshPrices();
      }

      selectTier(quantity) {
        this.quantity = quantity;
        this.querySelectorAll('[data-wa-bundle-tier]').forEach((button) => {
          const selected = Number(button.dataset.waBundleTier) === quantity;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-checked', selected ? 'true' : 'false');
        });

        this.selection.hidden = quantity === 1;
        this.renderExtraSlots(Math.max(0, quantity - 1));
        this.refreshPrices();
      }

      renderExtraSlots(count) {
        const existing = this.extraSlots.querySelectorAll('[data-wa-bundle-slot]').length;
        if (existing === count) return;

        this.extraSlots.innerHTML = '';
        for (let index = 0; index < count; index += 1) {
          const slot = document.createElement('div');
          slot.className = 'wa-bundle-picker__slot';
          slot.dataset.waBundleSlot = String(index + 2);
          slot.innerHTML = `
            <div class="wa-bundle-picker__slot-number">${index + 2}</div>
            <div class="wa-bundle-picker__fields">
              <button class="wa-bundle-picker__product-trigger" type="button" data-wa-bundle-product-trigger>
                <img class="wa-bundle-picker__slot-image" width="58" height="70" alt="" loading="lazy">
                <span class="wa-bundle-picker__product-copy">
                  <small>Style &amp; colour</small>
                  <strong data-wa-bundle-product-title></strong>
                  <span data-wa-bundle-product-meta></span>
                  <em class="wa-bundle-picker__change">Change style</em>
                </span>
              </button>
              <label class="wa-bundle-picker__size-field">
                <span>Size</span>
                <select data-wa-bundle-variant aria-label="Choose size"></select>
              </label>
            </div>`;

          const defaultProduct = this.defaultProductForSlot(index);
          if (defaultProduct) slot.dataset.productId = String(defaultProduct.id);
          slot.querySelector('[data-wa-bundle-product-trigger]').addEventListener('click', () => {
            this.openProductDialog(slot);
          });
          slot.querySelector('[data-wa-bundle-variant]').addEventListener('change', () => this.refreshPrices());
          this.extraSlots.appendChild(slot);
          this.populateVariants(
            slot,
            slot.dataset.productId,
            this.variantLabel(this.currentProduct, this.currentVariant())
          );
        }
      }

      productLabel(product) {
        return product.color ? `${product.title} · ${product.color}` : product.title;
      }

      variantLabel(product, variant) {
        if (!variant) return '';
        const sizeIndex = Array.isArray(product?.options)
          ? product.options.findIndex((name) => String(name).toLowerCase().includes('size'))
          : -1;
        const label = sizeIndex >= 0 ? variant.options?.[sizeIndex] : variant.title;
        return !label || label === 'Default Title' ? 'One size' : label;
      }

      defaultProductForSlot(index) {
        const currentIndex = this.products.findIndex((product) => String(product.id) === String(this.currentProduct.id));
        return this.products[(Math.max(0, currentIndex) + index + 1) % this.products.length] || this.currentProduct;
      }

      populateVariants(slot, productId, preferredTitle) {
        const product = this.products.find((item) => String(item.id) === String(productId));
        const variantSelect = slot.querySelector('[data-wa-bundle-variant]');
        const image = slot.querySelector('.wa-bundle-picker__slot-image');
        if (!product || !variantSelect) return;

        slot.dataset.productId = String(product.id);
        const productTitle = slot.querySelector('[data-wa-bundle-product-title]');
        const productMeta = slot.querySelector('[data-wa-bundle-product-meta]');
        const availablePrices = product.variants.filter((variant) => variant.available).map((variant) => Number(variant.price));
        const lowestPrice = availablePrices.length ? Math.min(...availablePrices) : 0;
        if (productTitle) productTitle.textContent = product.title;
        if (productMeta) {
          productMeta.textContent = [product.color, lowestPrice ? this.money(lowestPrice) : ''].filter(Boolean).join(' · ');
        }

        const previous = variantSelect.value;
        variantSelect.innerHTML = '';
        product.variants.forEach((variant) => {
          const option = document.createElement('option');
          option.value = String(variant.id);
          option.dataset.price = String(variant.price);
          option.disabled = !variant.available;
          option.textContent = `${this.variantLabel(product, variant)}${variant.available ? '' : ' — Sold out'}`;
          variantSelect.appendChild(option);
        });

        const preferred = product.variants.find(
          (variant) => variant.available && this.variantLabel(product, variant) === preferredTitle
        );
        const retained = product.variants.find((variant) => variant.available && String(variant.id) === previous);
        const selected = retained || preferred || product.variants.find((variant) => variant.available);
        if (selected) variantSelect.value = String(selected.id);

        if (image) {
          image.src = product.image || '';
          image.alt = this.productLabel(product);
          image.hidden = !product.image;
        }
      }

      openProductDialog(slot) {
        if (!this.dialog || !this.productGrid) return;
        this.activeSlot = slot;
        this.renderProductCards();
        if (this.search) this.search.value = '';
        this.filterProductCards();
        if (typeof this.dialog.showModal === 'function') this.dialog.showModal();
        else this.dialog.setAttribute('open', '');
        window.requestAnimationFrame(() => this.search?.focus());
      }

      closeProductDialog() {
        if (!this.dialog) return;
        if (typeof this.dialog.close === 'function') this.dialog.close();
        else this.dialog.removeAttribute('open');
        this.activeSlot?.querySelector('[data-wa-bundle-product-trigger]')?.focus();
      }

      renderProductCards() {
        const selectedId = String(this.activeSlot?.dataset.productId || '');
        this.productGrid.innerHTML = '';
        this.products.forEach((product) => {
          const availablePrices = product.variants.filter((variant) => variant.available).map((variant) => Number(variant.price));
          const card = document.createElement('button');
          card.type = 'button';
          card.className = 'wa-bundle-picker__product-card';
          card.dataset.search = `${product.title} ${product.color || ''}`.toLowerCase();
          card.classList.toggle('is-selected', String(product.id) === selectedId);
          card.setAttribute('aria-pressed', String(product.id) === selectedId ? 'true' : 'false');

          const image = document.createElement('img');
          image.width = 180;
          image.height = 220;
          image.loading = 'lazy';
          image.alt = this.productLabel(product);
          image.src = product.image || '';
          image.hidden = !product.image;

          const copy = document.createElement('span');
          copy.className = 'wa-bundle-picker__product-card-copy';
          const title = document.createElement('strong');
          title.textContent = product.title;
          const meta = document.createElement('span');
          const price = availablePrices.length ? Math.min(...availablePrices) : 0;
          meta.textContent = [product.color, price ? this.money(price) : ''].filter(Boolean).join(' · ');
          copy.append(title, meta);
          card.append(image, copy);
          card.addEventListener('click', () => {
            this.populateVariants(
              this.activeSlot,
              product.id,
              this.variantLabel(this.currentProduct, this.currentVariant())
            );
            this.refreshPrices();
            this.closeProductDialog();
          });
          this.productGrid.appendChild(card);
        });
      }

      filterProductCards() {
        const term = String(this.search?.value || '').trim().toLowerCase();
        let visible = 0;
        this.productGrid?.querySelectorAll('.wa-bundle-picker__product-card').forEach((card) => {
          const match = !term || card.dataset.search.includes(term);
          card.hidden = !match;
          if (match) visible += 1;
        });
        if (this.emptyState) this.emptyState.hidden = visible > 0;
      }

      selectedItems() {
        const current = this.currentVariant();
        if (!current?.available) return [];
        const items = [{ id: Number(current.id), quantity: 1, properties: { _wa_bundle: this.bundleKey() } }];

        this.extraSlots.querySelectorAll('[data-wa-bundle-slot]').forEach((slot) => {
          const option = slot.querySelector('[data-wa-bundle-variant]')?.selectedOptions?.[0];
          if (option && !option.disabled) {
            items.push({ id: Number(option.value), quantity: 1, properties: { _wa_bundle: this.bundleKey() } });
          }
        });
        return items;
      }

      bundleKey() {
        return `wa_${this.dataset.kind}_${this.quantity}`;
      }

      savingFor(quantity = this.quantity) {
        return Number(this.getAttribute(`data-save-${quantity}`) || 0);
      }

      selectedSubtotal() {
        const current = this.currentVariant();
        let subtotal = Number(current?.price || 0);
        this.extraSlots.querySelectorAll('[data-wa-bundle-variant]').forEach((select) => {
          subtotal += Number(select.selectedOptions?.[0]?.dataset.price || 0);
        });
        return subtotal;
      }

      refreshPrices() {
        const current = this.currentVariant();
        if (!current) return;

        const singlePrice = this.querySelector('[data-wa-tier-price="1"]');
        if (singlePrice) singlePrice.textContent = this.money(Number(current.price));

        const total = Math.max(0, this.selectedSubtotal() - this.savingFor());
        const saving = this.savingFor();
        this.summary.textContent =
          this.quantity === 1
            ? 'Choose a bundle to mix styles, colours and sizes.'
            : `${this.quantity} ${this.dataset.itemPlural} · ${this.money(total)} total · Save ${this.money(saving)}`;

        if (this.submitLabel) {
          this.submitLabel.textContent =
            this.quantity === 1 ? this.originalSubmitLabel : `Add ${this.quantity} to cart · ${this.money(total)}`;
        }
      }

      money(cents) {
        return `Rs. ${new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Math.round(cents / 100))}`;
      }

      async handleSubmit(event) {
        if (this.quantity === 1) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.setError('');

        const items = this.selectedItems();
        if (items.length !== this.quantity) {
          this.setError(`Choose an available size for every ${this.dataset.itemLabel}.`);
          return;
        }

        this.setLoading(true);
        const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
        const sections = cart?.getSectionsToRender?.().map((section) => section.id) || [];

        try {
          const response = await fetch(window.routes?.cart_add_url || '/cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ items, sections, sections_url: window.location.pathname }),
          });
          const result = await response.json();
          if (!response.ok || result.status) {
            throw new Error(result.description || result.message || 'Could not add bundle.');
          }

          if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
            await publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'wa-bundle-picker',
              productVariantId: items[0].id,
              cartData: result,
            });
          }
          window.waTrackAov?.('bundle_added', {
            bundle_kind: this.dataset.kind,
            quantity: this.quantity,
            saving: this.savingFor() / 100,
            subtotal: this.selectedSubtotal() / 100,
            variant_ids: items.map((item) => item.id),
          });
          if (cart?.renderContents) {
            cart.setActiveElement?.(this.submitButton);
            cart.renderContents(result);
          } else {
            window.location.assign(window.routes?.cart_url || '/cart');
          }
        } catch (error) {
          this.setError(error.message || 'Could not add this bundle. Please try again.');
        } finally {
          this.setLoading(false);
        }
      }

      setLoading(loading) {
        this.submitButton?.toggleAttribute('disabled', loading);
        this.submitButton?.classList.toggle('loading', loading);
        this.submitButton?.querySelector('.loading__spinner')?.classList.toggle('hidden', !loading);
      }

      setError(message) {
        if (!this.error) return;
        this.error.textContent = message;
        this.error.hidden = !message;
      }
    }
  );
}
