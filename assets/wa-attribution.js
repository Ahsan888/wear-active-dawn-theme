/**
 * Wear Active first-party attribution capture (Phase 5A — hardened).
 *
 * Storefront = capture evidence only.
 * Reporting repo = authoritative status / confidence / classification.
 *
 * - localStorage: wa_attribution_v1
 * - cart sync fingerprint: wa_attribution_cart_sync_v1
 * - cart payload: _wa_attr (valid compact JSON) + flattened helpers
 * - Consent: allowed | denied | unknown — capture only when allowed
 * - _fbp alone is NOT an acquisition signal
 * - landing/referrer strip arbitrary query strings
 * - Fails silently; never breaks cart/checkout
 *
 * Buy Now / Shop Pay / accelerated checkout may bypass cart attributes on
 * Shopify Basic — known coverage limitation (documented in ATTRIBUTION.md).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.WAAttribution = api;
    if (typeof document !== "undefined") {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
          api.run();
        });
      } else {
        api.run();
      }
    }
  }
})(typeof window !== "undefined" ? window : this, function () {
  var STORAGE_KEY = "wa_attribution_v1";
  var SYNC_KEY = "wa_attribution_cart_sync_v1";
  var CART_KEY = "_wa_attr";
  var VERSION = 1;
  var RETENTION_DAYS = 30;
  var MAX_PAYLOAD = 1800;
  var MAX = 240;
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

  function clean(v, max) {
    if (v == null || v === "") return null;
    var s = String(v)
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!s) return null;
    try {
      s = decodeURIComponent(s.replace(/\+/g, " "));
    } catch (e) {}
    s = s
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .replace(/<[^>]*>/g, "")
      .trim();
    if (!s) return null;
    return s.length > (max || MAX) ? s.slice(0, max || MAX) : s;
  }

  function isNumericId(v) {
    return /^\d{10,}$/.test(String(v || ""));
  }

  function pickParams(search) {
    var out = {};
    try {
      var sp = new URLSearchParams(search || "");
      sp.forEach(function (val, key) {
        var k = String(key).toLowerCase();
        if (!ALLOWED[k]) return;
        var c = clean(val, k === "fbclid" ? 200 : MAX);
        if (c) out[k] = c;
      });
    } catch (e) {}
    return out;
  }

  /** origin + pathname only — never arbitrary query params */
  function minimizeLanding(href) {
    try {
      var u = new URL(href, "https://wearactive.pk");
      return clean(u.origin + u.pathname, 500);
    } catch (e) {
      return null;
    }
  }

  /** Prefer origin (+ pathname) without query string */
  function minimizeReferrer(ref) {
    if (!ref) return null;
    try {
      var u = new URL(ref);
      return clean(u.origin + "/", 500);
    } catch (e) {
      return clean(String(ref).split("?")[0], 200);
    }
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
      timestamp: extras.timestamp || new Date().toISOString(),
    };
  }

  function blank(t) {
    if (!t) return true;
    // _fbp alone is NOT acquisition evidence
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

  function expired(touch, nowMs) {
    if (!touch || !touch.timestamp) return true;
    var t = Date.parse(touch.timestamp);
    if (!t) return true;
    return (nowMs || Date.now()) - t > RETENTION_DAYS * 86400000;
  }

  /**
   * Strong acquisition signals only.
   * utm_*, fbclid, _fbc, explicit Meta IDs — NOT _fbp alone.
   */
  function hasAcquisitionSignal(params, fbc) {
    if (params && Object.keys(params).length > 0) return true;
    if (fbc && clean(fbc, 200)) return true;
    return false;
  }

  function mergeVisit(state, visit, nowMs) {
    nowMs = nowMs || Date.now();
    var first = state && state.first_touch;
    var last = state && state.last_touch;

    if (first && expired(first, nowMs)) first = null;
    if (last && expired(last, nowMs)) last = null;

    var nextFirst = first;
    if (!first || blank(first)) {
      if (attributable(visit)) nextFirst = visit;
      else if (!first) nextFirst = visit;
    } else if (isDirect(visit)) {
      nextFirst = first;
    }

    var nextLast = last;
    if (attributable(visit)) nextLast = visit;
    else if (!last && attributable(nextFirst)) nextLast = nextFirst;
    else if (!last && isDirect(visit) && !attributable(nextFirst))
      nextLast = visit;

    return {
      version: VERSION,
      first_touch: nextFirst,
      last_touch: nextLast,
      updated_at: new Date(nowMs).toISOString(),
    };
  }

  function omitNulls(obj) {
    if (!obj || typeof obj !== "object") return obj;
    var out = {};
    Object.keys(obj).forEach(function (k) {
      if (obj[k] != null && obj[k] !== "") out[k] = obj[k];
    });
    return out;
  }

  function compactTouch(t, drops) {
    if (!t) return null;
    var c = omitNulls({
      source: t.source,
      medium: t.medium,
      campaign: t.campaign,
      content: t.content,
      term: drops && drops.term ? null : t.term,
      fbclid: t.fbclid,
      fbc: t.fbc,
      fbp: drops && drops.fbp ? null : t.fbp,
      campaign_id: t.campaign_id,
      adset_id: t.adset_id,
      ad_id: t.ad_id,
      landing_page: drops && drops.landing ? null : t.landing_page,
      referrer: drops && drops.referrer ? null : t.referrer,
      timestamp: t.timestamp,
    });
    return Object.keys(c).length ? c : null;
  }

  /**
   * Build valid JSON always ≤ MAX_PAYLOAD. Never slice mid-JSON.
   * Drop priority: referrer → landing → fbp → term → long names
   */
  function buildCompactPayload(state) {
    var drops = {};
    var levels = [
      {},
      { referrer: true },
      { referrer: true, landing: true },
      { referrer: true, landing: true, fbp: true },
      { referrer: true, landing: true, fbp: true, term: true },
    ];
    var i;
    for (i = 0; i < levels.length; i++) {
      drops = levels[i];
      var payload = {
        version: state.version || VERSION,
        first_touch: compactTouch(state.first_touch, drops),
        last_touch: compactTouch(state.last_touch, drops),
        updated_at: state.updated_at,
      };
      // shorten long human-readable names if still oversized
      var raw = JSON.stringify(payload);
      if (raw.length <= MAX_PAYLOAD) return raw;
      if (i === levels.length - 1) {
        ["first_touch", "last_touch"].forEach(function (key) {
          var t = payload[key];
          if (!t) return;
          ["campaign", "content"].forEach(function (f) {
            if (t[f] && t[f].length > 40) t[f] = t[f].slice(0, 40);
          });
        });
        raw = JSON.stringify(payload);
        if (raw.length <= MAX_PAYLOAD) return raw;
        // last resort: keep IDs + click evidence only
        ["first_touch", "last_touch"].forEach(function (key) {
          var t = payload[key];
          if (!t) return;
          payload[key] = omitNulls({
            source: t.source,
            medium: t.medium,
            fbclid: t.fbclid,
            fbc: t.fbc,
            campaign_id: t.campaign_id,
            adset_id: t.adset_id,
            ad_id: t.ad_id,
            timestamp: t.timestamp,
          });
        });
        return JSON.stringify(payload);
      }
    }
    return JSON.stringify({
      version: VERSION,
      first_touch: null,
      last_touch: null,
      updated_at: state.updated_at,
    });
  }

  function syncFingerprint(payloadJson, helpers) {
    return String(payloadJson.length) + ":" + payloadJson + "|" + JSON.stringify(helpers);
  }

  function simpleHash(s) {
    var h = 0;
    var i;
    for (i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  }

  /**
   * Consent tri-state: allowed | denied | unknown
   * Prefer marketingAllowed when present; else analyticsProcessingAllowed;
   * else unknown (do NOT fail open).
   */
  function attributionConsentState(privacy) {
    try {
      var p =
        privacy ||
        (typeof window !== "undefined" &&
          window.Shopify &&
          window.Shopify.customerPrivacy);
      if (!p) return "unknown";
      if (typeof p.marketingAllowed === "function") {
        return p.marketingAllowed() ? "allowed" : "denied";
      }
      if (typeof p.analyticsProcessingAllowed === "function") {
        return p.analyticsProcessingAllowed() ? "allowed" : "denied";
      }
      return "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function readCookie(name) {
    if (typeof document === "undefined") return null;
    try {
      var m = document.cookie.match(
        new RegExp(
          "(?:^|; )" +
            name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") +
            "=([^;]*)"
        )
      );
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function loadState(storage) {
    try {
      var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return null;
      var raw = store.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function saveState(state, storage) {
    try {
      var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return;
      store.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadSyncHash(storage) {
    try {
      var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return null;
      return store.getItem(SYNC_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveSyncHash(hash, storage) {
    try {
      var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
      if (!store) return;
      store.setItem(SYNC_KEY, hash);
    } catch (e) {}
  }

  function buildCartHelpers(state) {
    var helpers = { wa_attr_version: String(state.version || VERSION) };
    var ft = state.first_touch || {};
    var lt = state.last_touch || {};
    if (ft.source) helpers.wa_ft_source = String(ft.source).slice(0, 80);
    if (ft.campaign || ft.campaign_id)
      helpers.wa_ft_campaign = String(ft.campaign || ft.campaign_id).slice(0, 120);
    if (ft.content || ft.ad_id)
      helpers.wa_ft_content = String(ft.content || ft.ad_id).slice(0, 120);
    if (ft.fbclid) helpers.wa_ft_fbclid = String(ft.fbclid).slice(0, 120);
    if (lt.source) helpers.wa_lt_source = String(lt.source).slice(0, 80);
    if (lt.campaign || lt.campaign_id)
      helpers.wa_lt_campaign = String(lt.campaign || lt.campaign_id).slice(0, 120);
    if (lt.content || lt.ad_id)
      helpers.wa_lt_content = String(lt.content || lt.ad_id).slice(0, 120);
    return helpers;
  }

  function syncCart(state, opts) {
    opts = opts || {};
    if (!state) return Promise.resolve({ synced: false, reason: "no_state" });
    var payloadJson = buildCompactPayload(state);
    var helpers = buildCartHelpers(state);
    var fp = simpleHash(syncFingerprint(payloadJson, helpers));
    var storage = opts.storage;
    if (loadSyncHash(storage) === fp) {
      return Promise.resolve({ synced: false, reason: "unchanged", fingerprint: fp });
    }

    var attributes = {};
    attributes[CART_KEY] = payloadJson;
    Object.keys(helpers).forEach(function (k) {
      attributes[k] = helpers[k];
    });

    var url =
      opts.cartUrl ||
      (typeof window !== "undefined" &&
        window.routes &&
        window.routes.cart_update_url) ||
      "/cart/update.js";

    var fetchFn = opts.fetchFn || (typeof fetch !== "undefined" ? fetch : null);
    if (!fetchFn) {
      return Promise.resolve({ synced: false, reason: "no_fetch" });
    }

    try {
      return fetchFn(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ attributes: attributes }),
        credentials: "same-origin",
        keepalive: true,
      })
        .then(function (res) {
          if (res && res.ok) {
            saveSyncHash(fp, storage);
            return { synced: true, fingerprint: fp, status: res.status };
          }
          return {
            synced: false,
            reason: "http_" + (res && res.status),
            fingerprint: fp,
          };
        })
        .catch(function () {
          return { synced: false, reason: "network" };
        });
    } catch (e) {
      return Promise.resolve({ synced: false, reason: "error" });
    }
  }

  function run(opts) {
    opts = opts || {};
    try {
      var consent = attributionConsentState(opts.privacy);
      if (consent !== "allowed") {
        return { skipped: true, consent: consent };
      }

      var search =
        opts.search != null
          ? opts.search
          : typeof window !== "undefined"
            ? window.location.search
            : "";
      var params = pickParams(search);
      var fbc = opts.fbc != null ? opts.fbc : readCookie("_fbc");
      var fbp = opts.fbp != null ? opts.fbp : readCookie("_fbp");
      var signal = hasAcquisitionSignal(params, fbc);

      var href =
        opts.href ||
        (typeof window !== "undefined" ? window.location.href : "");
      var ref =
        opts.referrer != null
          ? opts.referrer
          : typeof document !== "undefined"
            ? document.referrer
            : "";

      var visit = touchFromParams(params, {
        fbc: fbc,
        fbp: fbp,
        landing_page: minimizeLanding(href),
        referrer: minimizeReferrer(ref),
        timestamp: opts.nowIso,
      });

      var storage = opts.storage;
      var state = loadState(storage);
      if (signal || attributable(visit)) {
        state = mergeVisit(state, visit, opts.nowMs);
        saveState(state, storage);
        if (!opts.skipSync) syncCart(state, opts);
        return { skipped: false, consent: consent, state: state, synced: true };
      }
      // No new acquisition — do not write/sync on every page load
      return { skipped: false, consent: consent, state: state, synced: false };
    } catch (e) {
      return { skipped: true, error: true };
    }
  }

  return {
    STORAGE_KEY: STORAGE_KEY,
    SYNC_KEY: SYNC_KEY,
    CART_KEY: CART_KEY,
    VERSION: VERSION,
    RETENTION_DAYS: RETENTION_DAYS,
    MAX_PAYLOAD: MAX_PAYLOAD,
    clean: clean,
    pickParams: pickParams,
    minimizeLanding: minimizeLanding,
    minimizeReferrer: minimizeReferrer,
    touchFromParams: touchFromParams,
    blank: blank,
    isDirect: isDirect,
    attributable: attributable,
    expired: expired,
    hasAcquisitionSignal: hasAcquisitionSignal,
    mergeVisit: mergeVisit,
    buildCompactPayload: buildCompactPayload,
    attributionConsentState: attributionConsentState,
    syncCart: syncCart,
    loadState: loadState,
    saveState: saveState,
    loadSyncHash: loadSyncHash,
    simpleHash: simpleHash,
    run: run,
  };
});
