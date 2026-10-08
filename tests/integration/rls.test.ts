import { describe, it, expect } from "vitest";
import { RUN, admin, anon, makeUser, makeBook, order } from "./helpers";

describe.skipIf(!RUN)("RLS & authorization (needs a real Supabase project; RUN_INTEGRATION=1)", () => {
  const db = admin();

  it("anonymous users cannot read orders, carts, or draft books", async () => {
    const a = anon();
    expect((await a.from("orders").select("id")).data ?? []).toHaveLength(0);
    expect((await a.from("cart_items").select("user_id")).data ?? []).toHaveLength(0);
    expect((await a.from("books").select("id").eq("status", "DRAFT")).data ?? []).toHaveLength(0);
  });

  it("users see only their own orders and cannot tamper with them", async () => {
    const book = await makeBook(db, 5);
    const [u1, u2] = await Promise.all([makeUser(db, "rls1"), makeUser(db, "rls2")]);
    const { data: id } = await order(db, u1.id, [{ book_id: book, quantity: 1 }]);
    expect((await u2.client.from("orders").select("id").eq("id", id)).data).toHaveLength(0);
    expect((await u1.client.from("orders").select("id").eq("id", id)).data).toHaveLength(1);
    await u1.client.from("orders").update({ total: 1, status: "PAID" }).eq("id", id);
    const { data: o } = await db.from("orders").select("total,status").eq("id", id).single();
    expect(o!.status).toBe("PENDING_PAYMENT"); // user cannot mark their own order paid
    expect(o!.total).not.toBe(1);        // nor change the total
  });

  it("users cannot escalate their role or call privileged RPCs", async () => {
    const u = await makeUser(db, "esc");
    await u.client.from("profiles").update({ role: "ADMIN" }).eq("id", u.id);
    expect((await db.from("profiles").select("role").eq("id", u.id).single()).data!.role).toBe("USER");
    expect((await u.client.rpc("mark_order_paid", { p_order: u.id, p_provider: "x", p_txn: "x", p_amount: 1, p_raw: {} })).error).not.toBeNull();
    expect((await u.client.rpc("create_order", { p_user: u.id, p_items: [], p_address: {}, p_shipping_cost: 0, p_courier: null, p_service: null, p_coupon: null })).error).not.toBeNull();
  });

  it("only purchasers can review", async () => {
    const book = await makeBook(db, 5);
    const u = await makeUser(db, "rev");
    const { error } = await u.client.from("reviews").insert({ book_id: book, user_id: u.id, rating: 5, body: "Tanpa membeli, seharusnya ditolak." });
    expect(error).not.toBeNull();
  });
});
