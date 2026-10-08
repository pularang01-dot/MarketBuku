import { describe, it, expect } from "vitest";
import { RUN, admin, makeUser, makeBook, order } from "./helpers";

describe.skipIf(!RUN)("orders & inventory (needs a real Supabase project; RUN_INTEGRATION=1)", () => {
  const db = admin();

  it("never oversells under concurrent checkouts", async () => {
    const book = await makeBook(db, 3);
    const users = await Promise.all([1, 2, 3, 4, 5].map((i) => makeUser(db, `race${i}`)));
    const results = await Promise.all(users.map((u) => order(db, u.id, [{ book_id: book, quantity: 1 }])));
    const ok = results.filter((r) => !r.error).length;
    expect(ok).toBe(3);
    const { data: inv } = await db.from("inventory").select("stock,reserved").eq("book_id", book).single();
    expect(inv).toEqual({ stock: 3, reserved: 3 });
    expect(results.filter((r) => r.error).every((r) => /INSUFFICIENT_STOCK/.test(r.error!.message))).toBe(true);
  }, 60_000);

  it("computes totals from the database, snapshotting prices", async () => {
    const book = await makeBook(db, 5, 40000);
    const u = await makeUser(db, "total");
    const { data: id, error } = await order(db, u.id, [{ book_id: book, quantity: 2 }]);
    expect(error).toBeNull();
    const { data: o } = await db.from("orders").select("subtotal,shipping_cost,total,status").eq("id", id).single();
    expect(o).toEqual({ subtotal: 80000, shipping_cost: 9000, total: 89000, status: "PENDING_PAYMENT" });
    await db.from("books").update({ price: 99999 }).eq("id", book); // later price change must not alter the old order
    const { data: items } = await db.from("order_items").select("price_snapshot").eq("order_id", id);
    expect(items![0].price_snapshot).toBe(40000);
  });

  it("mark_order_paid is idempotent and rejects wrong amounts", async () => {
    const book = await makeBook(db, 5, 30000);
    const u = await makeUser(db, "pay");
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    await db.from("payments").insert({ order_id: id, provider: "mock", provider_txn_id: `t-${id}`, amount: 39000 });
    expect((await db.rpc("mark_order_paid", { p_order: id, p_provider: "mock", p_txn: `t-${id}`, p_amount: 1, p_raw: {} })).data).toBe("AMOUNT_MISMATCH");
    expect((await db.rpc("mark_order_paid", { p_order: id, p_provider: "mock", p_txn: `t-${id}`, p_amount: 39000, p_raw: {} })).data).toBe("OK");
    expect((await db.rpc("mark_order_paid", { p_order: id, p_provider: "mock", p_txn: `t-${id}`, p_amount: 39000, p_raw: {} })).data).toBe("ALREADY_PROCESSED");
    const { data: inv } = await db.from("inventory").select("stock,reserved").eq("book_id", book).single();
    expect(inv).toEqual({ stock: 4, reserved: 0 }); // decremented exactly once
  });

  it("cancelling releases reservation; reversing a paid order restocks", async () => {
    const book = await makeBook(db, 4);
    const u = await makeUser(db, "cancel");
    const { data: a } = await order(db, u.id, [{ book_id: book, quantity: 2 }]);
    await db.rpc("cancel_pending_order", { p_order: a, p_actor: null, p_note: "test" });
    expect((await db.from("inventory").select("reserved").eq("book_id", book).single()).data!.reserved).toBe(0);
    const { data: b } = await order(db, u.id, [{ book_id: book, quantity: 2 }]);
    await db.from("payments").insert({ order_id: b, provider: "mock", provider_txn_id: `t-${b}`, amount: 59000 });
    await db.rpc("mark_order_paid", { p_order: b, p_provider: "mock", p_txn: `t-${b}`, p_amount: 59000 + 0, p_raw: {} });
    await db.rpc("reverse_paid_order", { p_order: b, p_actor: null, p_new: "REFUNDED", p_note: "test" });
    expect((await db.from("inventory").select("stock").eq("book_id", book).single()).data!.stock).toBe(4);
  });

  it("enforces coupon per-user limit and digital entitlements", async () => {
    const db2 = admin();
    const code = `IT${Date.now()}`.slice(0, 14).toUpperCase();
    await db2.from("coupons").insert({ code, type: "FIXED", value: 5000, per_user_limit: 1 });
    const book = await makeBook(db2, 5);
    const u = await makeUser(db2, "coupon");
    expect((await order(db2, u.id, [{ book_id: book, quantity: 1 }], code)).error).toBeNull();
    expect((await order(db2, u.id, [{ book_id: book, quantity: 1 }], code)).error?.message).toMatch(/COUPON_USER_LIMIT/);
    const ebook = await makeBook(db2, 0, 20000, "EBOOK");
    const { data: id } = await order(db2, u.id, [{ book_id: ebook, quantity: 1 }]);
    const { data: o } = await db2.from("orders").select("total,shipping_cost").eq("id", id).single();
    expect(o).toEqual({ total: 20000, shipping_cost: 0 });
    await db2.from("payments").insert({ order_id: id, provider: "mock", provider_txn_id: `t-${id}`, amount: 20000 });
    await db2.rpc("mark_order_paid", { p_order: id, p_provider: "mock", p_txn: `t-${id}`, p_amount: 20000, p_raw: {} });
    const { data: ent } = await db2.from("digital_entitlements").select("id").eq("user_id", u.id).eq("book_id", ebook);
    expect(ent).toHaveLength(1);
  });
});
