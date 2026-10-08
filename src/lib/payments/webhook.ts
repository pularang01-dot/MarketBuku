import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getPaymentProvider } from "./index";
import { sendEmail } from "@/lib/email";

/** Shared by /api/payments/webhook and the dev mock page: verify -> dedupe -> apply. */
export async function processPaymentWebhook(rawBody: string, headers: Headers) {
  const provider = getPaymentProvider();
  const evt = await provider.handleWebhook(rawBody, headers); // throws on bad signature
  const db = createSupabaseAdmin();

  const { error: dupErr } = await db.from("payment_webhook_events").insert({ id: `${provider.name}:${evt.eventId}`, provider: provider.name, payload: evt.raw as object });
  if (dupErr) {
    if (dupErr.code === "23505") return { ok: true, duplicate: true };
    throw dupErr;
  }

  if (evt.status === "PAID") {
    const { data, error } = await db.rpc("mark_order_paid", { p_order: evt.orderId, p_provider: provider.name, p_txn: evt.txnId, p_amount: evt.amount, p_raw: evt.raw });
    if (error) throw error;
    if (data === "AMOUNT_MISMATCH") console.error("[webhook] amount mismatch", evt.orderId);
    if (data === "OK") {
      const { data: o } = await db.from("orders").select("order_number, user_id").eq("id", evt.orderId).single();
      if (o) {
        const { data: u } = await db.auth.admin.getUserById(o.user_id);
        if (u.user?.email) await sendEmail(u.user.email, "payment_success", { order: o.order_number });
      }
    }
    return { ok: true, result: data };
  }
  if (evt.status === "FAILED" || evt.status === "EXPIRED") {
    await db.rpc("cancel_pending_order", { p_order: evt.orderId, p_actor: null, p_note: `payment ${evt.status.toLowerCase()}` });
  }
  return { ok: true };
}
