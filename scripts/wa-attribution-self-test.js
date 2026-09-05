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
    clear: () => {
      Object.keys(m).forEach((k) => delete m[k]);
    },
  };
}

function countingFetch(impl) {
  const wrap = async (...args) => {
    wrap.posts += 1;
    return impl(...args);
  };
  wrap.posts = 0;
  return wrap;
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
    assert.strictEqual(
      WA.mergeVisit(WA.mergeVisit(null, a), b).last_touch.fbclid,
      "2"
    );
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

  await test("unknown/denied consent creates no state and no sync", async () => {
    const attr = memStorage();
    const sync = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    assert.ok(
      WA.run({
        privacy: null,
        search: "?utm_source=facebook&utm_medium=paid",
        attributionStorage: attr,
        syncStorage: sync,
        fetchFn,
      }).skipped
    );
    assert.strictEqual(attr.getItem(WA.STORAGE_KEY), null);
    assert.strictEqual(fetchFn.posts, 0);

    assert.ok(
      WA.run({
        privacy: { marketingAllowed: () => false },
        search: "?utm_source=facebook&utm_medium=paid",
        attributionStorage: attr,
        syncStorage: sync,
        fetchFn,
      }).skipped
    );
    assert.strictEqual(fetchFn.posts, 0);
  });

  await test("allowed consent captures; no PII in landing", () => {
    const storage = memStorage();
    const r = WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid_social&fbclid=x",
      href: "https://wearactive.pk/collections/all?utm_source=facebook&email=no@x.com",
      referrer: "https://www.facebook.com/ads?x=1",
      attributionStorage: storage,
      skipSync: true,
    });
    assert.strictEqual(r.consent, "allowed");
    const st = JSON.parse(storage.getItem(WA.STORAGE_KEY));
    assert.strictEqual(st.first_touch.source, "facebook");
    assert.ok(!/email=/.test(JSON.stringify(st)));
  });

  await test("1+. existing acquisition → successful sync", async () => {
    const attr = memStorage();
    const sync = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    const r = WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid&fbclid=a1",
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn,
    });
    const result = await r.syncPromise;
    assert.ok(result.synced);
    assert.strictEqual(fetchFn.posts, 1);
    assert.ok(sync.getItem(WA.SYNC_KEY));
    assert.ok(attr.getItem(WA.STORAGE_KEY));
  });

  await test("2+. later same session → no second network POST", async () => {
    const attr = memStorage();
    const sync = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    const common = {
      privacy: { marketingAllowed: () => true },
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn,
    };
    await WA.run({
      ...common,
      search: "?utm_source=facebook&utm_medium=paid&fbclid=a1",
    }).syncPromise;
    assert.strictEqual(fetchFn.posts, 1);
    // Internal navigation — no new acquisition
    const r2 = WA.run({ ...common, search: "" });
    const result = await r2.syncPromise;
    assert.strictEqual(result.reason, "unchanged");
    assert.strictEqual(fetchFn.posts, 1);
  });

  await test("3-6. page1 fail → page2 retry → page3 no POST", async () => {
    const attr = memStorage();
    const sync = memStorage();
    let mode = "fail";
    const fetchFn = countingFetch(async () => {
      if (mode === "fail") return { ok: false, status: 500 };
      return { ok: true, status: 200 };
    });
    const common = {
      privacy: { marketingAllowed: () => true },
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn,
    };

    // page 1: acquisition + failed POST
    const p1 = WA.run({
      ...common,
      search: "?utm_source=facebook&utm_medium=paid&fbclid=retry1",
    });
    const r1 = await p1.syncPromise;
    assert.ok(!r1.synced);
    assert.strictEqual(sync.getItem(WA.SYNC_KEY), null);
    assert.ok(attr.getItem(WA.STORAGE_KEY));
    assert.strictEqual(fetchFn.posts, 1);

    // page 2: no new signal, fingerprint absent → retry
    mode = "ok";
    const p2 = WA.run({ ...common, search: "" });
    const r2 = await p2.syncPromise;
    assert.ok(r2.synced);
    assert.ok(sync.getItem(WA.SYNC_KEY));
    assert.strictEqual(fetchFn.posts, 2);

    // page 3: same fingerprint → no POST
    const p3 = WA.run({ ...common, search: "" });
    const r3 = await p3.syncPromise;
    assert.strictEqual(r3.reason, "unchanged");
    assert.strictEqual(fetchFn.posts, 2);
  });

  await test("7-8. new session re-syncs once", async () => {
    const attr = memStorage();
    const syncSession1 = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));

    await WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid&fbclid=s1",
      attributionStorage: attr,
      syncStorage: syncSession1,
      fetchFn,
    }).syncPromise;
    assert.strictEqual(fetchFn.posts, 1);
    assert.ok(syncSession1.getItem(WA.SYNC_KEY));
    assert.ok(attr.getItem(WA.STORAGE_KEY));

    // New browser session: attribution retained, sync fingerprint gone
    const syncSession2 = memStorage();
    assert.strictEqual(syncSession2.getItem(WA.SYNC_KEY), null);

    const r2 = await WA.run({
      privacy: { marketingAllowed: () => true },
      search: "",
      attributionStorage: attr,
      syncStorage: syncSession2,
      fetchFn,
    }).syncPromise;
    assert.ok(r2.synced);
    assert.strictEqual(fetchFn.posts, 2);

    const r3 = await WA.run({
      privacy: { marketingAllowed: () => true },
      search: "",
      attributionStorage: attr,
      syncStorage: syncSession2,
      fetchFn,
    }).syncPromise;
    assert.strictEqual(r3.reason, "unchanged");
    assert.strictEqual(fetchFn.posts, 2);
  });

  await test("9. new attributable visit → one sync", async () => {
    const attr = memStorage();
    const sync = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    const common = {
      privacy: { marketingAllowed: () => true },
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn,
    };
    await WA.run({
      ...common,
      search: "?utm_source=facebook&utm_medium=paid&fbclid=A",
    }).syncPromise;
    assert.strictEqual(fetchFn.posts, 1);

    const r2 = await WA.run({
      ...common,
      search: "?utm_source=facebook&utm_medium=paid&fbclid=B&utm_campaign=campB",
    }).syncPromise;
    assert.ok(r2.synced);
    assert.strictEqual(fetchFn.posts, 2);
    const st = JSON.parse(attr.getItem(WA.STORAGE_KEY));
    assert.strictEqual(st.first_touch.fbclid, "A");
    assert.strictEqual(st.last_touch.fbclid, "B");
  });

  await test("10-11. direct/internal keep attribution; sync network-free", async () => {
    const attr = memStorage();
    const sync = memStorage();
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    const common = {
      privacy: { marketingAllowed: () => true },
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn,
    };
    await WA.run({
      ...common,
      search: "?utm_source=facebook&utm_medium=paid&fbclid=keep",
    }).syncPromise;
    const before = JSON.parse(attr.getItem(WA.STORAGE_KEY));

    await WA.run({ ...common, search: "?utm_source=direct" }).syncPromise;
    await WA.run({ ...common, search: "" }).syncPromise;
    const after = JSON.parse(attr.getItem(WA.STORAGE_KEY));
    assert.strictEqual(after.first_touch.fbclid, before.first_touch.fbclid);
    assert.strictEqual(after.last_touch.fbclid, before.last_touch.fbclid);
    assert.strictEqual(fetchFn.posts, 1);
  });

  await test("12-13. denied/unknown consent → no sync", async () => {
    const attr = memStorage();
    const sync = memStorage();
    WA.saveState(
      WA.mergeVisit(
        null,
        WA.touchFromParams({
          utm_source: "facebook",
          utm_medium: "paid",
          fbclid: "x",
        })
      ),
      attr
    );
    const fetchFn = countingFetch(async () => ({ ok: true, status: 200 }));
    assert.ok(
      WA.run({
        privacy: { marketingAllowed: () => false },
        attributionStorage: attr,
        syncStorage: sync,
        fetchFn,
        search: "",
      }).skipped
    );
    assert.ok(
      WA.run({
        privacy: null,
        attributionStorage: attr,
        syncStorage: sync,
        fetchFn,
        search: "",
      }).skipped
    );
    assert.strictEqual(fetchFn.posts, 0);
  });

  await test("14. HTTP 2xx saves fingerprint", async () => {
    const sync = memStorage();
    const state = WA.mergeVisit(
      null,
      WA.touchFromParams({
        utm_source: "facebook",
        utm_medium: "paid",
        fbclid: "ok",
      })
    );
    const r = await WA.syncCart(state, {
      syncStorage: sync,
      fetchFn: async () => ({ ok: true, status: 200 }),
    });
    assert.ok(r.synced);
    assert.ok(sync.getItem(WA.SYNC_KEY));
  });

  await test("15. non-2xx does not save fingerprint", async () => {
    const sync = memStorage();
    const state = WA.mergeVisit(
      null,
      WA.touchFromParams({
        utm_source: "facebook",
        utm_medium: "paid",
        fbclid: "bad",
      })
    );
    const r = await WA.syncCart(state, {
      syncStorage: sync,
      fetchFn: async () => ({ ok: false, status: 503 }),
    });
    assert.ok(!r.synced);
    assert.strictEqual(sync.getItem(WA.SYNC_KEY), null);
  });

  await test("16. network reject does not save fingerprint", async () => {
    const sync = memStorage();
    const state = WA.mergeVisit(
      null,
      WA.touchFromParams({
        utm_source: "facebook",
        utm_medium: "paid",
        fbclid: "net",
      })
    );
    const r = await WA.syncCart(state, {
      syncStorage: sync,
      fetchFn: async () => {
        throw new Error("network");
      },
    });
    assert.ok(!r.synced);
    assert.strictEqual(sync.getItem(WA.SYNC_KEY), null);
  });

  await test("17. state absent → no sync", async () => {
    const r = await WA.syncCart(null, {
      syncStorage: memStorage(),
      fetchFn: countingFetch(async () => ({ ok: true, status: 200 })),
    });
    assert.strictEqual(r.reason, "no_state");
  });

  await test("18. payload remains valid JSON", () => {
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
  });

  await test("19+. _fbp alone still no acquisition via run", () => {
    const attr = memStorage();
    const r = WA.run({
      privacy: { marketingAllowed: () => true },
      search: "",
      fbp: "fb.1.only.fbp",
      fbc: null,
      attributionStorage: attr,
      skipSync: true,
    });
    assert.strictEqual(attr.getItem(WA.STORAGE_KEY), null);
    assert.ok(!r.state || !WA.hasSyncableState(r.state));
  });

  await test("20+. arbitrary query PII still excluded", () => {
    const attr = memStorage();
    WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid&email=leak@x.com&phone=123",
      href: "https://wearactive.pk/?email=leak@x.com&utm_source=facebook",
      referrer: "https://google.com/search?q=secret&email=x",
      attributionStorage: attr,
      skipSync: true,
    });
    const raw = attr.getItem(WA.STORAGE_KEY);
    assert.ok(raw);
    assert.ok(!/leak@/.test(raw));
    assert.ok(!/email=/.test(raw));
    assert.ok(!/phone=/.test(raw));
  });

  await test("sync fingerprint uses session storage not attribution storage", async () => {
    const attr = memStorage();
    const sync = memStorage();
    await WA.run({
      privacy: { marketingAllowed: () => true },
      search: "?utm_source=facebook&utm_medium=paid&fbclid=sep",
      attributionStorage: attr,
      syncStorage: sync,
      fetchFn: async () => ({ ok: true, status: 200 }),
    }).syncPromise;
    assert.ok(attr.getItem(WA.STORAGE_KEY));
    assert.strictEqual(attr.getItem(WA.SYNC_KEY), null);
    assert.ok(sync.getItem(WA.SYNC_KEY));
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
        attributionStorage: memStorage(),
        skipSync: true,
      });
    });
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

main();
