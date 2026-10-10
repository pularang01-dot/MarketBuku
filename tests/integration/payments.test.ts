import { describe, it, expect } from "vitest";
import { RUN, admin, makeUser, makeBook, order } from "./helpers";

describe.skipIf(!RUN)("manual payment proofs (needs a real Supabase project; RUN_INTEGRATION=1)", () => {
  const db = admin();
  const proof = (orderId: string, userId: string, amount = 59000) =>
    db.from("payment_proofs").insert({ order_id: orderId, user_id: userId, file_path: `${userId}/${orderId}/t.png`, sender_name: "Uji", amount });

  it("uploading a proof never marks the order paid", async () => {
    const u = await makeUser(db, "p1"); const book = await makeBook(db, 5);
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    await proof(id, u.id);
    expect((await db.from("orders").select("status").eq("id", id).single()).data!.status).toBe("PENDING_PAYMENT");
  });

  it("expiry skips orders whose proof is awaiting verification, but cancels the rest", async () => {
    const u = await makeUser(db, "p2"); const book = await makeBook(db, 5);
    const { data: withProof } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    const { data: without } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    await proof(withProof, u.id);
    await db.from("orders").update({ expires_at: new Date(Date.now() - 3_600_000).toISOString() }).in("id", [withProof, without]);
    await db.rpc("expire_stale_orders");
    expect((await db.from("orders").select("status").eq("id", withProof).single()).data!.status).toBe("PENDING_PAYMENT");
    expect((await db.from("orders").select("status").eq("id", without).single()).data!.status).toBe("CANCELLED");
  });

  it("only one pending proof per order (when migration 0007 index exists)", async () => {
    const u = await makeUser(db, "p3"); const book = await makeBook(db, 5);
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    expect((await proof(id, u.id)).error).toBeNull();
    const second = await proof(id, u.id);
    expect(second.error?.code).toBe("23505");
  });

  it("another user cannot read someone else's proof (RLS)", async () => {
    const [a, b] = await Promise.all([makeUser(db, "p4a"), makeUser(db, "p4b")]); const book = await makeBook(db, 5);
    const { data: id } = await order(db, a.id, [{ book_id: book, quantity: 1 }]);
    await proof(id, a.id);
    expect((await a.client.from("payment_proofs").select("id").eq("order_id", id)).data).toHaveLength(1);
    expect((await b.client.from("payment_proofs").select("id").eq("order_id", id)).data).toHaveLength(0);
  });

  it("a normal user cannot insert or approve proofs directly", async () => {
    const u = await makeUser(db, "p5"); const book = await makeBook(db, 5);
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    const ins = await u.client.from("payment_proofs").insert({ order_id: id, user_id: u.id, file_path: "x", sender_name: "x", amount: 1 });
    expect(ins.error).not.toBeNull();
    await db.from("payment_proofs").insert({ order_id: id, user_id: u.id, file_path: "x", sender_name: "x", amount: 59000 });
    await u.client.from("payment_proofs").update({ status: "APPROVED" }).eq("order_id", id);
    expect((await db.from("payment_proofs").select("status").eq("order_id", id).single()).data!.status).toBe("PENDING");
  });

  it("approval is idempotent: stock is decremented once", async () => {
    const u = await makeUser(db, "p6"); const book = await makeBook(db, 5, 30000);
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 1 }]);
    await db.from("payments").insert({ order_id: id, provider: "manual", provider_txn_id: `MANUAL-${id}`, amount: 39000 });
    const call = () => db.rpc("mark_order_paid", { p_order: id, p_provider: "manual", p_txn: `MANUAL-${id}`, p_amount: 39000, p_raw: {} });
    const [r1, r2] = await Promise.all([call(), call()]);
    expect([r1.data, r2.data].sort()).toEqual(["ALREADY_PROCESSED", "OK"]);
    expect((await db.from("inventory").select("stock").eq("book_id", book).single()).data!.stock).toBe(4);
  });

  it("auto-expiry cancels an overdue unpaid order, releases stock and notifies the buyer", async () => {
    const u = await makeUser(db, "p7"); const book = await makeBook(db, 3);
    const { data: id } = await order(db, u.id, [{ book_id: book, quantity: 2 }]);
    expect((await db.from("inventory").select("reserved").eq("book_id", book).single()).data!.reserved).toBe(2);
    await db.from("orders").update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", id);
    await db.rpc("expire_stale_orders");
    expect((await db.from("orders").select("status").eq("id", id).single()).data!.status).toBe("CANCELLED");
    expect((await db.from("inventory").select("reserved").eq("book_id", book).single()).data!.reserved).toBe(0);
    const { data: ev } = await db.from("order_events").select("note").eq("order_id", id).eq("to_status", "CANCELLED");
    expect(ev?.[0]?.note).toBe("expired");
    const { data: notes } = await db.from("notifications").select("title").eq("user_id", u.id);
    expect(notes?.some((n) => /dibatalkan otomatis/i.test(n.title))).toBe(true);
  });
});