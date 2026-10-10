import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";

let last = 0;
/**
 * Lazy expiry: cancels overdue unpaid orders (and releases their reserved stock) whenever a page that shows the
 * payment deadline is opened. Works without pg_cron. Orders with a proof awaiting verification are skipped in SQL.
 * Throttled to once a minute per server instance.
 */
export async function sweepExpiredOrders() {
  const now = Date.now();
  if (now - last < 60_000) return;
  last = now;
  try { await createSupabaseAdmin().rpc("expire_stale_orders"); }
  catch (e) { console.error("[expiry] sweep failed", e); }
}