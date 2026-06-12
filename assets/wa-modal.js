/**
 * Wear Active custom code start — wa-modal.js
 * Accessible modal dialog custom element. Namespaced as wa-modal.
 */
class WaModal extends HTMLElement {
  constructor() {
    super();
    this.moved = false;
    this.listenersAttached = false;
    this.scrollLocked = false;
    this.scrollY = 0;
    this.openedBy = null;

    this.onKeyUp = this.onKeyUp.bind(this);
    this.onOverlayClick = this.onOverlayClick.bind(this);
    this.onCloseClick = this.onCloseClick.bind(this);
  }

  connectedCallback() {
    if (!this.moved) {
      this.moved = true;
      document.body.appendChild(this);
    }

    if (this.listenersAttached) return;
    this.listenersAttached = true;

    this.overlay = this.querySelector('.wa-modal__overlay');
    this.closeButtons = this.querySelectorAll('[data-wa-modal-close]');

    this.overlay?.addEventListener('click', this.onOverlayClick);
    this.closeButtons.forEach((button) => button.addEventListener('click', this.onCloseClick));
  }

  disconnectedCallback() {
    if (this.hasAttribute('open')) {
      this.unlockScroll();
    }
  }

  open(opener = null) {
    this.openedBy = opener;
    this.lockScroll();
    this.setAttribute('open', '');
    document.addEventListener('keyup', this.onKeyUp);

    const focusTarget =
      this.querySelector('[data-wa-modal-close]') ||
      this.querySelector('[data-wa-modal-focus]') ||
      this.querySelector('.wa-modal__dialog');

    focusTarget?.focus({ preventScroll: true });
  }

  close() {
    if (!this.hasAttribute('open') || this.classList.contains('wa-modal--closing')) return;

    const opener = this.openedBy;
    this.openedBy = null;
    document.removeEventListener('keyup', this.onKeyUp);

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finishClose(opener);
      return;
    }

    this.classList.add('wa-modal--closing');

    const dialog = this.querySelector('.wa-modal__dialog');
    const onAnimationEnd = (event) => {
      if (event.target !== dialog || event.animationName !== 'wa-modal-dialog-out') return;
      dialog.removeEventListener('animationend', onAnimationEnd);
      this.finishClose(opener);
    };

    dialog?.addEventListener('animationend', onAnimationEnd);
    this._closeTimer = window.setTimeout(() => this.finishClose(opener), 350);
  }

  finishClose(opener) {
    if (this._closeTimer) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    if (!this.hasAttribute('open')) return;

    this.classList.remove('wa-modal--closing');
    this.removeAttribute('open');
    this.unlockScroll();

    if (opener?.focus) {
      opener.focus({ preventScroll: true });
    }
  }

  lockScroll() {
    if (this.scrollLocked) return;

    this.scrollY = window.scrollY || document.documentElement.scrollTop;
    this.scrollLocked = true;

    document.body.classList.add('wa-modal-open');
    document.body.style.position = 'fixed';
    document.body.style.top = `-${this.scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }

  unlockScroll() {
    if (!this.scrollLocked) return;

    const scrollY = this.scrollY;
    this.scrollLocked = false;

    document.body.classList.remove('wa-modal-open');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';

    window.scrollTo(0, scrollY);
  }

  onKeyUp(event) {
    if (event.code === 'Escape') this.close();
  }

  onOverlayClick(event) {
    if (event.target === this.overlay) this.close();
  }

  onCloseClick() {
    this.close();
  }
}

if (!customElements.get('wa-modal')) {
  customElements.define('wa-modal', WaModal);
}
