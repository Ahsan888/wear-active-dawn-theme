/**
 * Wear Active first-party attribution capture (Phase 5A).
 * - Stores first/last attributable touch in localStorage (wa_attribution_v1)
 * - Syncs compact payload to Shopify cart attributes (_wa_attr)
 * - Does not capture PII
 * - Fails gracefully if storage/cart APIs unavailable
 */
(function () {
  var STORAGE_KEY = "wa_attribution_v1";
  var CART_KEY = "_wa_attr";
  var VERSION = 1;
  var RETENTION_DAYS = 30;
  var ALLOWED = {
    utm_source: 1,
    utm_medium: 1,
    utm_campaign: 1,
    utm_content: 1,
    utm_term: 1,
    fbclid: 1,
    campaign_id: 1,
    adset_id: 1,
    ad_id: 1,
  };
  var MAX = 240;

  function clean(v, max) {
    if (v == null || v === "") return null;
    var s = String(v).replace(/<[^>]*>/g, "").trim();
    if (!s) return null;
    try {
      s = decodeURIComponent(s.replace(/\+/g, " "));
    } catch (e) {}
    s = s.replace(/<[^>]*>/g, "").trim();
    if (!s) return null;
    return s.length > (max || MAX) ? s.slice(0, max || MAX) : s;
  }

  function readCookie(name) {
    try {
      var m = document.cookie.match(
        new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
      );
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function pickParams(search) {
    var out = {};
    try {
      var sp = new URLSearchParams(search || window.location.search || "");
      sp.forEach(function (val, key) {
        var k = String(key).toLowerCase();
        if (!ALLOWED[k]) return;
        var c = clean(val, k === "fbclid" ? 200 : MAX);
        if (c) out[k] = c;
      });
    } catch (e) {}
    return out;
  }

  function isNumericId(v) {
    return /^\d{10,}$/.test(String(v || ""));
  }

  function touchFromParams(params, extras) {
    extras = extras || {};
    var campaign_id =
      clean(params.campaign_id) ||
      (isNumericId(params.utm_campaign) ? String(params.utm_campaign) : null);
    var ad_id =
      clean(params.ad_id) ||
      (isNumericId(params.utm_content) ? String(params.utm_content) : null);
    var adset_id =
      clean(params.adset_id) ||
      (isNumericId(params.utm_term) ? String(params.utm_term) : null);
    return {
      source: clean(params.utm_source),
      medium: clean(params.utm_medium),
      campaign: isNumericId(params.utm_campaign)
        ? null
        : clean(params.utm_campaign),
      content: isNumericId(params.utm_content)
        ? null
        : clean(params.utm_content),
      term: isNumericId(params.utm_term) ? null : clean(params.utm_term),
      fbclid: clean(params.fbclid, 200),
      fbc: clean(extras.fbc, 200),
      fbp: clean(extras.fbp, 200),
      campaign_id: campaign_id,
      adset_id: adset_id,
      ad_id: ad_id,
      landing_page: clean(extras.landing_page, 500),
      referrer: clean(extras.referrer, 500),
      timestamp: new Date().toISOString(),
    };
  }

  function blank(t) {
    if (!t) return true;
    return !(
      t.source ||
      t.medium ||
      t.campaign ||
      t.content ||
      t.term ||
      t.fbclid ||
      t.fbc ||
      t.campaign_id ||
      t.adset_id ||
      t.ad_id
    );
  }

  function isDirect(t) {
    if (!t || blank(t)) return true;
    var s = String(t.source || "").toLowerCase();
    return s === "direct" || s === "(direct)";
  }

  function attributable(t) {
    return t && !blank(t) && !isDirect(t);
  }

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function expired(touch) {
    if (!touch || !touch.timestamp) return true;
    var t = Date.parse(touch.timestamp);
    if (!t) return true;
    return Date.now() - t > RETENTION_DAYS * 86400000;
  }

  function mergeVisit(state, visit) {
    var first = state && state.first_touch;
    var last = state && state.last_touch;
    var nextFirst = first;
    if (!first || blank(first) || expired(first)) {
      if (attributable(visit)) nextFirst = visit;
      else if (!first) nextFirst = visit;
    } else if (isDirect(visit)) {
      nextFirst = first;
    }
    var nextLast = last;
    if (attributable(visit)) nextLast = visit;
    else if (!last && attributable(nextFirst)) nextLast = nextFirst;
    else if (!last) nextLast = visit;
    return {
      version: VERSION,
      first_touch: nextFirst,
      last_touch: nextLast,
      updated_at: new Date().toISOString(),
    };
  }

  function consentAllowsMarketing() {
    try {
      if (
        window.Shopify &&
        window.Shopify.customerPrivacy &&
        typeof window.Shopify.customerPrivacy.analyticsProcessingAllowed ===
          "function"
      ) {
        // Prefer marketing if available; else analytics
        if (
          typeof window.Shopify.customerPrivacy.marketingAllowed === "function"
        ) {
          return window.Shopify.customerPrivacy.marketingAllowed();
        }
        return window.Shopify.customerPrivacy.analyticsProcessingAllowed();
      }
    } catch (e) {}
    return true; // fail-open only for storage attempt; cart still works if blocked
  }

  function syncCart(state) {
    if (!state) return;
    var url =
      (window.routes && window.routes.cart_update_url) || "/cart/update.js";
    var body = {
      attributes: {},
    };
    body.attributes[CART_KEY] = JSON.stringify(state).slice(0, 1800);
    // Compact flattened helpers for webhook / LIVE
    var ft = state.first_touch || {};
    var lt = state.last_touch || {};
    body.attributes.wa_attr_version = String(state.version || VERSION);
    if (ft.source) body.attributes.wa_ft_source = String(ft.source).slice(0, 80);
    if (ft.campaign || ft.campaign_id)
      body.attributes.wa_ft_campaign = String(
        ft.campaign || ft.campaign_id
      ).slice(0, 120);
    if (ft.content || ft.ad_id)
      body.attributes.wa_ft_content = String(ft.content || ft.ad_id).slice(
        0,
        120
      );
    if (ft.fbclid)
      body.attributes.wa_ft_fbclid = String(ft.fbclid).slice(0, 120);
    if (lt.source) body.attributes.wa_lt_source = String(lt.source).slice(0, 80);
    if (lt.campaign || lt.campaign_id)
      body.attributes.wa_lt_campaign = String(
        lt.campaign || lt.campaign_id
      ).slice(0, 120);
    if (lt.content || lt.ad_id)
      body.attributes.wa_lt_content = String(lt.content || lt.ad_id).slice(
        0,
        120
      );

    try {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function run() {
    if (!consentAllowsMarketing()) return;
    var params = pickParams();
    var hasSignal =
      Object.keys(params).length > 0 ||
      readCookie("_fbc") ||
      readCookie("_fbp");
    // Always ensure state exists; only update last attributable on signals
    var visit = touchFromParams(params, {
      fbc: readCookie("_fbc"),
      fbp: readCookie("_fbp"),
      landing_page: window.location.href.split("#")[0],
      referrer: document.referrer || null,
    });
    var state = loadState();
    if (hasSignal || attributable(visit)) {
      state = mergeVisit(state, visit);
      saveState(state);
      syncCart(state);
    } else if (state) {
      // Re-sync existing attribution to cart on later pages
      syncCart(state);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // Expose tiny test hooks (non-PII)
  window.WAAttribution = {
    storageKey: STORAGE_KEY,
    run: run,
    loadState: loadState,
  };
})();
