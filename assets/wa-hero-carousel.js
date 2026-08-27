if (!customElements.get('wa-hero-carousel')) {
  customElements.define(
    'wa-hero-carousel',
    class WaHeroCarousel extends HTMLElement {
      connectedCallback() {
        this.track = this.querySelector('[data-wa-carousel-track]');
        this.slides = Array.from(this.querySelectorAll('[data-wa-carousel-slide]'));
        this.dots = Array.from(this.querySelectorAll('[data-wa-carousel-dot]'));
        this.previousButton = this.querySelector('[data-wa-carousel-previous]');
        this.nextButton = this.querySelector('[data-wa-carousel-next]');
        this.pauseButton = this.querySelector('[data-wa-carousel-pause]');
        this.currentIndex = 0;
        this.userPaused = false;
        this.autoplay = this.dataset.autoplay === 'true';
        this.delay = Math.max(Number(this.dataset.delay) || 5, 3) * 1000;
        this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        if (!this.track || this.slides.length < 2) return;

        this.previousButton?.addEventListener('click', () => this.show(this.currentIndex - 1, true));
        this.nextButton?.addEventListener('click', () => this.show(this.currentIndex + 1, true));
        this.dots.forEach((dot, index) => dot.addEventListener('click', () => this.show(index, true)));
        this.pauseButton?.addEventListener('click', () => this.togglePause());
        this.addEventListener('keydown', (event) => this.onKeydown(event));
        this.addEventListener('mouseenter', () => this.stop());
        this.addEventListener('mouseleave', () => this.start());
        this.addEventListener('focusin', () => this.stop());
        this.addEventListener('focusout', (event) => {
          if (!this.contains(event.relatedTarget)) this.start();
        });
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) this.stop();
          else this.start();
        });
        this.reducedMotion.addEventListener?.('change', () => this.start());

        this.show(0, false);
        this.start();
      }

      disconnectedCallback() {
        this.stop();
      }

      show(index, restartAutoplay) {
        this.currentIndex = (index + this.slides.length) % this.slides.length;
        this.track.style.transform = `translate3d(-${this.currentIndex * 100}%, 0, 0)`;

        this.slides.forEach((slide, slideIndex) => {
          const active = slideIndex === this.currentIndex;
          slide.setAttribute('aria-hidden', active ? 'false' : 'true');
          slide.querySelectorAll('a, button').forEach((element) => {
            element.tabIndex = active ? 0 : -1;
          });
        });

        this.dots.forEach((dot, dotIndex) => {
          const active = dotIndex === this.currentIndex;
          dot.setAttribute('aria-current', active ? 'true' : 'false');
        });

        if (restartAutoplay) {
          this.stop();
          this.start();
        }
      }

      start() {
        this.stop();
        if (!this.autoplay || this.userPaused || this.reducedMotion.matches || document.hidden) return;
        this.timer = window.setInterval(() => this.show(this.currentIndex + 1, false), this.delay);
      }

      stop() {
        window.clearInterval(this.timer);
      }

      togglePause() {
        this.userPaused = !this.userPaused;
        this.pauseButton.setAttribute('aria-pressed', this.userPaused ? 'true' : 'false');
        this.pauseButton.setAttribute('aria-label', this.userPaused ? 'Play slideshow' : 'Pause slideshow');
        if (this.userPaused) this.stop();
        else this.start();
      }

      onKeydown(event) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          this.show(this.currentIndex - 1, true);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          this.show(this.currentIndex + 1, true);
        }
      }
    }
  );
}
