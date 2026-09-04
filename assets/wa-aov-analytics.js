/** Wear Active AOV feature events, published to Shopify Customer Events. */
(() => {
  const publish = (name, data = {}) => {
    const eventName = `wear_active:${name}`;
    const payload = { ...data, path: window.location.pathname };

    if (window.Shopify?.analytics?.publish) {
      window.Shopify.analytics.publish(eventName, payload);
    }

    document.dispatchEvent(new CustomEvent('wa:aov-event', { detail: { name: eventName, data: payload } }));
  };

  window.waTrackAov = publish;

  document.addEventListener('click', (event) => {
    const tier = event.target.closest('[data-wa-bundle-tier]');
    if (tier) {
      const picker = tier.closest('wa-bundle-picker');
      publish('bundle_tier_selected', {
        bundle_kind: picker?.dataset.kind,
        quantity: Number(tier.dataset.waBundleTier || 1),
        saving: Number(tier.dataset.waBundleSaving || 0) / 100,
      });
      return;
    }

    const selector = event.target.closest('[data-wa-bundle-product-trigger]');
    if (selector) {
      const picker = selector.closest('wa-bundle-picker');
      publish('bundle_selector_opened', {
        bundle_kind: picker?.dataset.kind,
        quantity: Number(picker?.quantity || 1),
      });
      return;
    }

    const recommendationLink = event.target.closest('[data-wa-aov-action="cart_recommendation_clicked"]');
    if (recommendationLink) {
      const recommendation = recommendationLink.closest('wa-cart-complete-look');
      publish('cart_recommendation_clicked', {
        placement: 'cart_drawer',
        product_id: recommendation?.dataset.productId,
        product_handle: recommendation?.dataset.productHandle,
      });
      return;
    }

    const completeLookLink = event.target.closest('.wa-complete-look .card__heading a, .wa-complete-look .card__media a');
    if (completeLookLink) {
      publish('complete_look_clicked', { placement: 'product_page', destination: completeLookLink.href });
    }
  });

  let pendingCompleteLookAdd = null;
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target.closest('.wa-complete-look form[action*="/cart/add"]');
      if (!form) return;
      let sourceInput = form.querySelector('[name="properties[_wa_source]"]');
      if (!sourceInput) {
        sourceInput = document.createElement('input');
        sourceInput.type = 'hidden';
        sourceInput.name = 'properties[_wa_source]';
        form.appendChild(sourceInput);
      }
      sourceInput.value = 'product_complete_look';
      pendingCompleteLookAdd = {
        variant_id: String(new FormData(form).get('id') || ''),
        placement: 'product_page',
      };
      publish('complete_look_add_clicked', pendingCompleteLookAdd);
    },
    true
  );

  if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
    subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (!pendingCompleteLookAdd || String(event?.productVariantId || '') !== pendingCompleteLookAdd.variant_id) return;
      publish('complete_look_added', pendingCompleteLookAdd);
      pendingCompleteLookAdd = null;
    });
  }
})();
