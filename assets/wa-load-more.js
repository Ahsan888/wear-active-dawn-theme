/**
 * Wear Active collection Load More.
 * Progressive enhancement: native pagination remains available without JavaScript.
 */
if (!customElements.get('wa-load-more')) {
  customElements.define(
    'wa-load-more',
    class WALoadMore extends HTMLElement {
      connectedCallback() {
        if (this.initialized) return;

        this.initialized = true;
        this.button = this.querySelector('.wa-load-more__button');
        this.label = this.querySelector('.wa-load-more__label');
        this.loadingLabel = this.querySelector('.wa-load-more__loading');
        this.fallbackPagination = this.closest('.collection')?.querySelector('[data-wa-pagination-fallback]');
        this.nextUrl = this.dataset.nextUrl;
        this.isLoading = false;

        if (!this.button || !this.nextUrl) {
          this.hideControl();
          return;
        }

        this.hidden = false;
        if (this.fallbackPagination) this.fallbackPagination.hidden = true;
        this.button.addEventListener('click', this.onClick.bind(this));
      }

      async onClick() {
        if (this.isLoading || !this.nextUrl) return;

        this.setLoading(true);

        try {
          const nextPageUrl = new URL(this.nextUrl, window.location.origin);
          const response = await fetch(nextPageUrl.href, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
          });

          if (!response.ok) throw new Error(`Load more request failed: ${response.status}`);

          const html = await response.text();
          const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
          const sourceGrid = parsedDocument.querySelector('#ProductGridContainer #product-grid');
          const targetGrid = document.querySelector('#ProductGridContainer #product-grid');

          if (!sourceGrid || !targetGrid) throw new Error('Product grid was not found in the next page response.');

          const newItems = Array.from(sourceGrid.children);
          if (!newItems.length) {
            this.hideControl();
            return;
          }

          newItems.forEach((item, index) => {
            item.querySelectorAll('link[rel="stylesheet"]').forEach((stylesheet) => stylesheet.remove());
            item.classList.add('scroll-trigger--cancel');
            item.classList.add('wa-load-more__item');
            item.style.animationDelay = `${Math.min(index, 8) * 20}ms`;
            targetGrid.appendChild(item);
          });

          this.updateStateFromNextPage(parsedDocument);
          this.updateHistory(nextPageUrl);
          this.dispatchProductsAppended(newItems);
        } catch (error) {
          console.error(error);
        } finally {
          this.setLoading(false);
        }
      }

      updateStateFromNextPage(parsedDocument) {
        const nextLoadMore = parsedDocument.querySelector('wa-load-more');
        const nextUrl = nextLoadMore?.dataset.nextUrl;

        this.dataset.currentPage = nextLoadMore?.dataset.currentPage || this.dataset.currentPage;
        this.nextUrl = nextUrl || '';
        this.dataset.nextUrl = this.nextUrl;

        if (!this.nextUrl) this.hideControl();
      }

      updateHistory(nextPageUrl) {
        const nextPath = `${nextPageUrl.pathname}${nextPageUrl.search}`;
        history.replaceState({ path: nextPath }, '', nextPath);
      }

      dispatchProductsAppended(items) {
        document.dispatchEvent(
          new CustomEvent('wa:products-appended', {
            detail: {
              container: document.querySelector('#ProductGridContainer #product-grid'),
              items,
            },
          })
        );

        if (window.jdgm && typeof window.jdgm.refreshWidgets === 'function') {
          window.jdgm.refreshWidgets();
        }
      }

      setLoading(isLoading) {
        this.isLoading = isLoading;
        this.button.disabled = isLoading;
        this.button.setAttribute('aria-busy', isLoading ? 'true' : 'false');
        if (this.label) this.label.hidden = isLoading;
        if (this.loadingLabel) this.loadingLabel.hidden = !isLoading;
      }

      hideControl() {
        this.hidden = true;
      }
    }
  );
}
