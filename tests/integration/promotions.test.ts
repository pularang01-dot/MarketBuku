import { describe, it, expect } from "vitest";
import { RUN, admin, anon, makeUser, makeBook, ADDR } from "./helpers";

/**
 * Needs a real Supabase project with migrations 0001-0010 (RUN_INTEGRATION=1). Use a TEST project, never production.
 * These tests exercise create_order_v3 / coupon lifecycle directly with hand-built quotes; the price calculation itself
 * is covered by the unit tests in tests/pricing-engine.test.ts.
 */
describe.skipIf(!RUN)("promotion engine: atomic parts (create_order_v3, coupon lifecycle, RLS)", () => {
  const db = admin();
  const SELL = 50000, SHIP = 9000;

  async function makeCoupon(o: Record<string, unknown> = {}) {
    const code = `IT${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toUpperCase().slice(0, 20);
    const { data, error } = await db.from("coupons").insert({ code, type: "FIXED", value: 5000, per_user_limit: 1, ...o }).select("id, code").single();
    if (error) throw error;
    return data as { id: string; code: string };
  }
  const v3 = (userId: string, bookId: string, opts: { qty?: number; coupon?: { id: string; code: string }; cdisc?: number; tweak?: (q: Record<string, unknown>, items: Record<string, unknown>[]) => void } = {}) => {
    const qty = opts.qty ?? 1, cdisc = opts.coupon ? opts.cdisc ?? 5000 : 0;
    const items: Record<string, unknown>[] = [{ book_id: bookId, quantity: qty, selling_unit: SELL, list_price: SELL, promo_id: null, promo_title: null, promo_unit_discount: 0 }];
    const quote: Record<string, unknown> = { subtotal: SELL * qty, promo_discount: 0, bundle_discount: 0, bundle_id: null, coupon_id: opts.coupon?.id ?? null, coupon_code: opts.coupon?.code ?? null, coupon_discount: cdisc, shipping_cost: SHIP, shipping_discount: 0, total: SELL * qty - cdisc + SHIP, snapshot: { test: true } };
    opts.tweak?.(quote, items);
    return db.rpc("create_order_v3", { p_user: userId, p_items: items, p_address: ADDR, p_courier: "DEV", p_service: "REG", p_quote: quote });
  };
  const usage = async (orderId: string) => (await db.from("coupon_usages").select("status, released_at").eq("order_id", orderId).single()).data!;
  const used = async (couponId: string) => (await db.from("coupons").select("used_count").eq("id", couponId).single()).data!.used_count;

  it("global quota is race-proof: exactly N succeed under concurrency", async () => {
    const coupon = await makeCoupon({ usage_limit: 2 }); const book = await makeBook(db, 20, SELL);
    const users = await Promise.all([1, 2, 3, 4, 5].map((i) => makeUser(db, `q${i}`)));
    const res = await Promise.all(users.map((u) => v3(u.id, book, { coupon })));
    expect(res.filter((r) => !r.error)).toHaveLength(2);
    expect(res.filter((r) => r.error).every((r) => /COUPON_EXHAUSTED/.test(r.error!.message))).toBe(true);
    expect(await used(coupon.id)).toBe(2);
  }, 60_000);

  it("per-user limit holds even for parallel requests from the same user", async () => {
    const coupon = await makeCoupon({ per_user_limit: 1 }); const book = await makeBook(db, 20, SELL); const u = await makeUser(db, "pu");
    const res = await Promise.all([v3(u.id, book, { coupon }), v3(u.id, book, { coupon })]);
    expect(res.filter((r) => !r.error)).toHaveLength(1);
    expect(res.find((r) => r.error)!.error!.message).toMatch(/COUPON_USER_LIMIT/);
  });

  it("cancelling an unpaid order releases the coupon once and keeps the history", async () => {
    const coupon = await makeCoupon({ usage_limit: 3 }); const book = await makeBook(db, 5, SELL); const u = await makeUser(db, "rel");
    const { data: id } = await v3(u.id, book, { coupon });
    expect(await used(coupon.id)).toBe(1);
    expect((await usage(id)).status).toBe("RESERVED");
    expect((await db.rpc("cancel_pending_order", { p_order: id, p_actor: null, p_note: "test" })).data).toBe(true);
    expect((await db.rpc("cancel_pending_order", { p_order: id, p_actor: null, p_note: "test again" })).data).toBe(false); // idempotent
    expect(await used(coupon.id)).toBe(0);                       // released exactly once
    const row = await usage(id);
    expect(row.status).toBe("RELEASED");                         // history row still exists
    expect(row.released_at).not.toBeNull();
    // the user can use the coupon again
    expect((await v3(u.id, book, { coupon })).error).toBeNull();
  });

  it("payment turns the reservation into a redemption; a later refund does not restore the coupon", async () => {
    const coupon = await makeCoupon({ usage_limit: 3 }); const book = await makeBook(db, 5, SELL); const u = await makeUser(db, "red");
    const { data: id } = await v3(u.id, book, { coupon });
    const total = SELL - 5000 + SHIP;
    await db.from("payments").insert({ order_id: id, provider: "manual", provider_txn_id: `MANUAL-${id}`, amount: total });
    expect((await db.rpc("mark_order_paid", { p_order: id, p_provider: "manual", p_txn: `MANUAL-${id}`, p_amount: total, p_raw: {} })).data).toBe("OK");
    expect((await usage(id)).status).toBe("REDEEMED");
    await db.rpc("reverse_paid_order", { p_order: id, p_actor: null, p_new: "REFUNDED", p_note: "test" });
    expect((await usage(id)).status).toBe("REDEEMED");
    expect(await used(coupon.id)).toBe(1);
  });

  it("the database rejects numbers that do not match its own prices or rules", async () => {
    const book = await makeBook(db, 20, SELL); const u = await makeUser(db, "tamper");
    const priceChanged = await v3(u.id, book, { tweak: (q, items) => { items[0].selling_unit = 1; items[0].list_price = 1; q.subtotal = 1; q.total = 1 + SHIP; } });
    expect(priceChanged.error?.message).toMatch(/PRICE_CHANGED/);
    const wrongTotal = await v3(u.id, book, { tweak: (q) => { q.total = 1; } });
    expect(wrongTotal.error?.message).toMatch(/QUOTE_MISMATCH/);
    const phantomDiscount = await v3(u.id, book, { tweak: (q) => { q.coupon_discount = 20000; q.total = SELL - 20000 + SHIP; } }); // discount without any coupon
    expect(phantomDiscount.error?.message).toMatch(/QUOTE_MISMATCH/);
    const fakePromo = await v3(u.id, book, { tweak: (q, items) => { items[0].promo_id = "00000000-0000-0000-0000-000000000000"; items[0].promo_unit_discount = 10000; q.promo_discount = 10000; q.total = SELL - 10000 + SHIP; } });
    expect(fakePromo.error?.message).toMatch(/PROMO_CHANGED/);
    const dup = await db.rpc("create_order_v3", { p_user: u.id, p_items: [{ book_id: book, quantity: 1, selling_unit: SELL, list_price: SELL, promo_id: null, promo_unit_discount: 0 }, { book_id: book, quantity: 1, selling_unit: SELL, list_price: SELL, promo_id: null, promo_unit_discount: 0 }], p_address: ADDR, p_courier: null, p_service: null, p_quote: { subtotal: SELL * 2, promo_discount: 0, bundle_discount: 0, coupon_discount: 0, shipping_cost: SHIP, shipping_discount: 0, total: SELL * 2 + SHIP } });
    expect(dup.error?.message).toMatch(/INVALID_ITEMS/);
  });

  it("an order is a snapshot: later price or promotion changes never alter it", async () => {
    const coupon = await makeCoupon(); const book = await makeBook(db, 5, SELL); const u = await makeUser(db, "snap");
    const { data: id } = await v3(u.id, book, { coupon });
    const before = (await db.from("orders").select("subtotal, discount, total, coupon_code").eq("id", id).single()).data;
    await db.from("books").update({ price: 99999, sale_price: null }).eq("id", book);
    await db.from("coupons").update({ value: 40000, active: false }).eq("id", coupon.id);
    const after = (await db.from("orders").select("subtotal, discount, total, coupon_code").eq("id", id).single()).data;
    expect(after).toEqual(before);
    const { data: items } = await db.from("order_items").select("price_snapshot, list_price_snapshot").eq("order_id", id);
    expect(items![0]).toEqual({ price_snapshot: SELL, list_price_snapshot: SELL });
  });

  it("inactive or expired coupons are rejected at save time too", async () => {
    const book = await makeBook(db, 5, SELL); const u = await makeUser(db, "inact");
    const off = await makeCoupon({ active: false });
    expect((await v3(u.id, book, { coupon: off })).error?.message).toMatch(/COUPON_INACTIVE/);
    const past = await makeCoupon({ starts_at: new Date(Date.now() - 7_200_000).toISOString(), ends_at: new Date(Date.now() - 3_600_000).toISOString() });
    expect((await v3(u.id, book, { coupon: past })).error?.message).toMatch(/COUPON_EXPIRED/);
  });

  it("RLS: visitors see only public, active, in-window coupons; users cannot write promotions or coupons", async () => {
    const pub = await makeCoupon({ is_public: true }); const hidden = await makeCoupon({ is_public: false });
    const a = anon();
    const ids = ((await a.from("coupons").select("id")).data ?? []).map((r) => r.id);
    expect(ids).toContain(pub.id);
    expect(ids).not.toContain(hidden.id);
    const u = await makeUser(db, "rls");
    expect((await u.client.from("coupons").insert({ code: "HACK1", type: "FIXED", value: 1 })).error).not.toBeNull();
    expect((await u.client.from("promotions").insert({ title: "x", slug: `x-${Date.now()}`, benefit_type: "PERCENT", benefit_value: 99 })).error).not.toBeNull();
    expect((await u.client.rpc("create_order_v3", { p_user: u.id, p_items: [], p_address: {}, p_courier: null, p_service: null, p_quote: {} })).error).not.toBeNull();
    expect((await u.client.rpc("coupon_stats")).error).not.toBeNull();
  });
});