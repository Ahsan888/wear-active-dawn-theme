#!/usr/bin/env node
/**
 * Deterministic self-tests for Dawn first-party attribution capture.
 * Run: node scripts/wa-attribution-self-test.js
 */
const assert = require("assert");
const path = require("path");
const WA = require(path.join(__dirname, "..", "assets", "wa-attribution.js"));

let passed = 0;
let failed = 0;

function memStorage() {
  const m = {};
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => {
      m[k] = String(v);
    },
    removeItem: (k) => {
      delete m[k];
    },
  };
}

async function test(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(err.message || err);
  }
}

async function main() {
  await test("1. Meta UTM capture", () => {
    const p = WA.pickParams(
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer"
    );
    assert.strictEqual(p.utm_source, "facebook");
    assert.ok(WA.attributable(WA.touchFromParams(p, {})));
  });

  await test("2. fbclid capture", () => {
    const t = WA.touchFromParams({ fbclid: "phase5-test-click" }, {});
    assert.ok(WA.attributable(t));
  });

  await test("3. _fbc supporting capture", () => {
    assert.ok(WA.hasAcquisitionSignal({}, "fb.1.123.456"));
    assert.ok(WA.attributable(WA.touchFromParams({}, { fbc: "fb.1.123.456" })));
  });

  await test("4. _fbp alone does not create acquisition", () => {
    assert.ok(!WA.hasAcquisitionSignal({}, null));
    const t = WA.touchFromParams({}, { fbp: "fb.1.999.888" });
    assert.ok(WA.blank(t));
    assert.ok(!WA.attributable(t));
  });

  await test("5. _fbp retained with real acquisition", () => {
    const t = WA.touchFromParams(
      { utm_source: "facebook", utm_medium: "paid" },
      { fbp: "fb.1.999.888" }
    );
    assert.strictEqual(t.fbp, "fb.1.999.888");
    assert.ok(WA.attributable(t));
  });

  await test("6-8. stable campaign/adset/ad IDs", () => {
    const t = WA.touchFromParams({
      utm_campaign: "123456789012345",
      utm_content: "987654321098765",
      utm_term: "456789012345678",
      utm_source: "facebook",
      utm_medium: "paid_social",
    });
    assert.strictEqual(t.campaign_id, "123456789012345");
    assert.strictEqual(t.ad_id, "987654321098765");
    assert.strictEqual(t.adset_id, "456789012345678");
  });

  await test("9. first touch persists", () => {
    const a = WA.touchFromParams({
      utm_source: "facebook",
      utm_medium: "paid",
      fbclid: "1",
    });
    const s2 = WA.mergeVisit(
      WA.mergeVisit(null, a),
      WA.touchFromParams({ utm_source: "google", utm_medium: "cpc" })
    );
    assert.strictEqual(s2.first_touch.fbclid, "1");
  });

  await test("10. last attributable updates", () => {
    const a = WA.touchFromParams({
      utm_source: "facebook",
      utm_medium: "paid",
      fbclid: "1",
    });
    const b = WA.touchFromParams({
      utm_source: "facebook",
      utm_medium: "paid",
      fbclid: "2",
    });
    assert.strictEqual(WA.mergeVisit(WA.mergeVisit(null, a), b).last_touch.fbclid, "2");
  });

  await test("11. direct return does not erase", () => {
    const paid = WA.touchFromParams({
      utm_source: "facebook",
      utm_medium: "paid",
      fbclid: "abc",
    });
    const s = WA.mergeVisit(
      WA.mergeVisit(null, paid),
      WA.touchFromParams({ utm_source: "direct" })
    );
    assert.strictEqual(s.first_touch.fbclid, "abc");
    assert.strictEqual(s.last_touch.fbclid, "abc");
  });

  await test("12. internal navigation does not update", () => {
    const paid = WA.touchFromParams({
      utm_source: "facebook",
      utm_medium: "paid",
      fbclid: "abc",
    });
    const s2 = WA.mergeVisit(WA.mergeVisit(null, paid), WA.touchFromParams({}));
    assert.strictEqual(s2.last_touch.fbclid, "abc");
  });

  await test("13. 30-day expiry", () => {
    const old = WA.touchFromParams(
      { utm_source: "facebook", utm_medium: "paid", fbclid: "old" },
      { timestamp: "2020-01-01T00:00:00.000Z" }
    );
    const next = WA.mergeVisit(
      { version: 1, first_touch: old, last_touch: old },
      WA.touchFromParams({ utm_source: "google", utm_medium: "cpc" }),
      Date.parse("2026-09-06T00:00:00Z")
    );
    assert.strictEqual(next.first_touch.source, "google");
  });

  await test("14. stale touch cleared on direct after expiry", () => {
    const old = WA.touchFromParams(
      { utm_source: "facebook", utm_medium: "paid", fbclid: "old" },
      { timestamp: "2020-01-01T00:00:00.000Z" }
    );
    const next = WA.mergeVisit(
      { version: 1, first_touch: old, last_touch: old },
      WA.touchFromParams({ utm_source: "direct" }),
      Date.parse("2026-09-06T00:00:00Z")
    );
    assert.ok(!next.first_touch || !next.first_touch.fbclid);
  });

  await test("15. consent allowed", () => {
    assert.strictEqual(
      WA.attributionConsentState({ marketingAllowed: () => true }),
      "allowed"
    );
  });

  await test("16. consent denied", () => {
    assert.strictEqual(
      WA.attributionConsentState({ marketingAllowed: () => false }),
      "denied"
    );
  });

  await test("17. consent unknown when privacy absent", () => {
    assert.strictEqual(WA.attributionConsentState(null), "unknown");
  });

  await test("18. privacy API throws → unknown", () => {
    assert.strictEqual(
      WA.attributionConsentState({
        marketingAllowed: () => {
          throw new Error("x");
        },
      }),
      "unknown"
    );
  });

  await test("marketing absent, analytics allowed/denied", () => {
    assert.strictEqual(
      WA.attributionConsentState({ analyticsProcessingAllowed: () => true }),
      "allowed"
    );
    assert.strictEqual(
      WA.attributionConsentState({ analyticsProcessingAllowed: () => false }),
      "denied"
    );
  });

  await test("19. arbitrary params ignored", () => {
    const p = WA.pickParams("?email=a@b.com&utm_source=facebook&foo=bar");
    assert.strictEqual(p.utm_source, "facebook");
    assert.ok(!p.email);
  });

  await test("20-22. landing/referrer strip PII-like query", () => {
    const land = WA.minimizeLanding(
      "https://wearactive.pk/product/x?utm_source=facebook&email=test@example.com"
    );
    assert.ok(!/email=/.test(land));
    assert.ok(!/utm_source=/.test(land));
    const ref = WA.minimizeReferrer(
      "https://www.facebook.com/l.php?u=https%3A%2F%2Fx&email=secret"
    );
    assert.ok(!/email=/.test(ref));
  });

  await test("unknown/denied consent creates no state", () => {
    const s1 = memStorage();
    assert.ok(
      WA.run({
        privacy: null,
        search: "?utm_source=facebook&utm_medium=paid",
        storage: s1,
        skipSync: true,
      }).skipped
    );
    assert.strictEqual(s1.getItem(WA.STORAGE_KEY), null);

    const s2 = memStorage();
    assert.ok(
      WA.run({
        privacy: { marketingAllowed: () => false },
        search: "?utm_source=facebook&utm_medium=paid",
        storage: s2,
        skipSync: true,
      }).skipped
    );
    assert.strictEqual(s2.getItem(WA.STORAGE_KEY), null);
  });

  await test("allowed consent captures; no PII in landing", () => {
    const storage = memStorage();
    const r = WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid_social&fbclid=x",
      href: "https://wearactive.pk/collections/all?utm_source=facebook&email=no@x.com",
      referrer: "https://www.facebook.com/ads?x=1",
      storage,
      skipSync: true,
    });
    assert.strictEqual(r.consent, "allowed");
    const st = JSON.parse(storage.getItem(WA.STORAGE_KEY));
    assert.strictEqual(st.first_touch.source, "facebook");
    assert.ok(!/email=/.test(JSON.stringify(st)));
  });

  await test("23-26. cart sync idempotency + HTTP status", async () => {
    const storage = memStorage();
    const state = WA.mergeVisit(
      null,
      WA.touchFromParams({
        utm_source: "facebook",
        utm_medium: "paid",
        fbclid: "1",
      })
    );
    let posts = 0;
    const fetchOk = async () => {
      posts += 1;
      return { ok: true, status: 200 };
    };
    assert.ok((await WA.syncCart(state, { storage, fetchFn: fetchOk })).synced);
    const r2 = await WA.syncCart(state, { storage, fetchFn: fetchOk });
    assert.strictEqual(r2.reason, "unchanged");
    assert.strictEqual(posts, 1);

    storage.removeItem(WA.SYNC_KEY);
    const fetchFail = async () => ({ ok: false, status: 500 });
    assert.ok(!(await WA.syncCart(state, { storage, fetchFn: fetchFail })).synced);
    assert.strictEqual(storage.getItem(WA.SYNC_KEY), null);
    assert.ok((await WA.syncCart(state, { storage, fetchFn: fetchOk })).synced);
  });

  await test("27-28. compact payload valid JSON within limit", () => {
    const huge = "x".repeat(800);
    const state = {
      version: 1,
      first_touch: WA.touchFromParams(
        {
          utm_source: "facebook",
          utm_medium: "paid_social",
          utm_campaign: huge,
          fbclid: "click",
          campaign_id: "123456789012345",
          adset_id: "456789012345678",
          ad_id: "987654321098765",
        },
        {
          landing_page: "https://wearactive.pk/" + huge,
          referrer: "https://facebook.com/" + huge,
          fbp: "fb.1." + huge,
        }
      ),
      last_touch: null,
      updated_at: new Date().toISOString(),
    };
    const raw = WA.buildCompactPayload(state);
    assert.ok(raw.length <= WA.MAX_PAYLOAD);
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.first_touch.campaign_id, "123456789012345");
    assert.strictEqual(parsed.first_touch.ad_id, "987654321098765");
  });

  await test("29-30. storefront failure swallowed", () => {
    assert.doesNotThrow(() => {
      WA.run({
        privacy: {
          marketingAllowed: () => {
            throw new Error("boom");
          },
        },
        search: "?utm_source=facebook",
        storage: memStorage(),
        skipSync: true,
      });
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
