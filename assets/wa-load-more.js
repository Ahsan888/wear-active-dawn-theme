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
        this.abortController = null;
        this.requestId = 0;

        if (!this.button || !this.nextUrl) {
          this.hideControl();
          return;
        }

        this.hidden = false;
        if (this.fallbackPagination) this.fallbackPagination.hidden = true;
        this.button.addEventListener('click', this.onClick.bind(this));
      }

      disconnectedCallback() {
        if (this.abortController) this.abortController.abort();
      }

      async onClick() {
        if (this.isLoading || !this.nextUrl) return;

        this.setLoading(true);
        this.requestId += 1;
        const requestId = this.requestId;
        const requestPath = `${window.location.pathname}${window.location.search}`;
        const requestGrid = document.querySelector('#ProductGridContainer #product-grid');
        this.abortController = new AbortController();

        try {
          const nextPageUrl = new URL(this.nextUrl, window.location.origin);
          const response = await fetch(nextPageUrl.href, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            signal: this.abortController.signal,
          });

          if (!response.ok) throw new Error(`Load more request failed: ${response.status}`);

          const html = await response.text();
          if (!this.isCurrentRequest(requestId, requestPath, requestGrid)) return;

          const parsedDocument = new DOMParser().parseFromString(html, 'text/html');
          const sourceGrid = parsedDocument.querySelector('#ProductGridContainer #product-grid');
          const targetGrid = document.querySelector('#ProductGridContainer #product-grid');

          if (!this.isCurrentRequest(requestId, requestPath, requestGrid) || targetGrid !== requestGrid) return;
          if (!sourceGrid || !targetGrid) throw new Error('Product grid was not found in the next page response.');

          const newItems = Array.from(sourceGrid.children).filter((item) => !this.hasDuplicateItem(targetGrid, item));
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
          if (error.name === 'AbortError') return;
          console.error(error);
        } finally {
          if (this.isConnected && this.requestId === requestId) {
            this.setLoading(false);
            this.abortController = null;
          }
        }
      }

      isCurrentRequest(requestId, requestPath, requestGrid) {
        const currentPath = `${window.location.pathname}${window.location.search}`;
        return this.isConnected && this.requestId === requestId && currentPath === requestPath && requestGrid?.isConnected;
      }

      hasDuplicateItem(targetGrid, item) {
        const productLink = item.querySelector('.card__heading a[href], .full-unstyled-link[href]');
        const productPath = productLink ? new URL(productLink.href, window.location.origin).pathname : '';

        if (!productPath) return false;

        return Array.from(targetGrid.querySelectorAll('.card__heading a[href], .full-unstyled-link[href]')).some(
          (existingLink) => new URL(existingLink.href, window.location.origin).pathname === productPath
        );
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
        history.replaceState({ searchParams: nextPageUrl.search.slice(1), path: nextPath }, '', nextPath);
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
