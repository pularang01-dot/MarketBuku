import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";

let last = 0;
/**
 * Lazy expiry: cancels overdue unpaid orders (releasing their reserved stock) whenever a page that depends on
 * payment status is opened. Works even without pg_cron. Orders with a proof awaiting verification are skipped in SQL.
 * Throttled per server instance (15 s); pass { force: true } to run immediately.
 */
export async function sweepExpiredOrders(opts: { force?: boolean } = {}) {
  const now = Date.now();
  if (!opts.force && now - last < 15_000) return;
  last = now;
  try { await createSupabaseAdmin().rpc("expire_stale_orders"); }
  catch (e) { console.error("[expiry] sweep failed", e); }
}