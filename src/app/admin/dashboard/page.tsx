import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";

export default async function Dashboard() {
  const db = createSupabaseAdmin();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const paid = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];
  const [orders, customers, books, low, items, recent] = await Promise.all([
    db.from("orders").select("total, created_at, status").in("status", paid),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("role", "USER"),
    db.from("books").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    db.from("inventory").select("book_id, stock, reserved, low_stock_threshold, books(title)").order("stock").limit(50),
    db.from("order_items").select("title_snapshot, quantity, price_snapshot, orders!inner(status, created_at)").in("orders.status", paid).gte("orders.created_at", since),
    db.from("orders").select("order_number, total, status, created_at").order("created_at", { ascending: false }).limit(5),
  ]);
  const pend = await db.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "PENDING");
  const revenue = (orders.data ?? []).reduce((s, o) => s + o.total, 0);
  const lowList = (low.data ?? []).filter((i) => i.stock - i.reserved <= i.low_stock_threshold);
  const byTitle = new Map<string, { qty: number; rev: number }>();
  (items.data ?? []).forEach((i) => { const c = byTitle.get(i.title_snapshot) ?? { qty: 0, rev: 0 }; c.qty += i.quantity; c.rev += i.quantity * i.price_snapshot; byTitle.set(i.title_snapshot, c); });
  const top = [...byTitle].sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const daily = new Map<string, number>();
  (orders.data ?? []).filter((o) => o.created_at >= since).forEach((o) => { const d = o.created_at.slice(0, 10); daily.set(d, (daily.get(d) ?? 0) + o.total); });
  const days = [...daily].sort(); const max = Math.max(1, ...days.map(([, v]) => v));
  const kpi = [["Total pendapatan", formatRupiah(revenue)], ["Pesanan dibayar", String(orders.data?.length ?? 0)], ["Pelanggan", String(customers.count ?? 0)], ["Buku terbit", String(books.count ?? 0)], ["Bukti bayar menunggu", String(pend.count ?? 0)]];
  return (
    <div className="space-y-6"><h1 className="text-3xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{kpi.map(([k, v]) => <div key={k} className="card p-4"><p className="text-xs text-ink-mute">{k}</p><p className="text-2xl font-bold">{v}</p></div>)}</div>
      <section className="card p-4"><h2 className="text-lg font-bold">Pendapatan 30 hari</h2>{!days.length ? <p className="text-sm text-ink-mute">Belum ada transaksi.</p> :
        <div className="mt-3 flex h-40 items-end gap-1" role="img" aria-label="Grafik pendapatan harian">{days.map(([d, v]) => <div key={d} title={`${d}: ${formatRupiah(v)}`} className="flex-1 rounded-t bg-brand" style={{ height: `${(v / max) * 100}%`, minHeight: 4 }} />)}</div>}</section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-4"><h2 className="text-lg font-bold">Buku terlaris (30 hari)</h2><ol className="mt-2 space-y-1 text-sm">{top.map(([t, v]) => <li key={t} className="flex justify-between"><span className="truncate pr-2">{t}</span><span>{v.qty} · {formatRupiah(v.rev)}</span></li>)}{!top.length && <li className="text-ink-mute">Belum ada data.</li>}</ol></section>
        <section className="card p-4"><h2 className="text-lg font-bold">Stok menipis</h2><ul className="mt-2 space-y-1 text-sm">{lowList.map((i) => <li key={i.book_id} className="flex justify-between"><span className="truncate pr-2">{(i.books as unknown as { title: string })?.title}</span><span className="text-danger">{i.stock - i.reserved}</span></li>)}{!lowList.length && <li className="text-ink-mute">Semua stok aman.</li>}</ul></section>
      </div>
      <section className="card p-4"><h2 className="text-lg font-bold">Pesanan terbaru</h2><ul className="mt-2 text-sm">{recent.data?.map((o) => <li key={o.order_number} className="flex justify-between py-1"><span>{o.order_number} · {o.status}</span><span>{formatRupiah(o.total)}</span></li>)}</ul></section>
    </div>
  );
}