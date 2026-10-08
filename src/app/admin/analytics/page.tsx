import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
export default async function Analytics() {
  const db = createSupabaseAdmin();
  const paid = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];
  const [{ data: orders }, { data: users }, { data: cats }] = await Promise.all([
    db.from("orders").select("total, user_id").in("status", paid),
    db.from("profiles").select("created_at").eq("role", "USER").gte("created_at", new Date(Date.now() - 30 * 864e5).toISOString()),
    db.from("order_items").select("quantity, price_snapshot, book:books(book_categories(category:categories(name))), orders!inner(status)").in("orders.status", paid),
  ]);
  const n = orders?.length ?? 0, rev = (orders ?? []).reduce((s, o) => s + o.total, 0);
  const perUser = new Map<string, number>(); (orders ?? []).forEach((o) => perUser.set(o.user_id, (perUser.get(o.user_id) ?? 0) + 1));
  const repeat = [...perUser.values()].filter((c) => c > 1).length;
  const catRev = new Map<string, number>();
  (cats ?? []).forEach((i) => { const bc = (i.book as unknown as { book_categories: { category: { name: string } }[] } | null)?.book_categories ?? []; bc.forEach((x) => catRev.set(x.category.name, (catRev.get(x.category.name) ?? 0) + i.quantity * i.price_snapshot)); });
  const rows: [string, string][] = [["Pendapatan", formatRupiah(rev)], ["Jumlah pesanan", String(n)], ["Rata-rata nilai pesanan", formatRupiah(n ? Math.round(rev / n) : 0)], ["Pelanggan baru (30 hari)", String(users?.length ?? 0)], ["Pelanggan berulang", String(repeat)]];
  return (<><h1 className="mb-4 text-3xl font-bold">Analitik</h1><dl className="grid gap-3 sm:grid-cols-3">{rows.map(([k, v]) => <div key={k} className="card p-4"><dt className="text-xs text-ink-mute">{k}</dt><dd className="text-xl font-bold">{v}</dd></div>)}</dl><section className="card mt-4 p-4"><h2 className="text-lg font-bold">Penjualan per kategori</h2><ul className="mt-2 text-sm">{[...catRev].sort((a, b) => b[1] - a[1]).map(([c, v]) => <li key={c} className="flex justify-between py-1"><span>{c}</span><span>{formatRupiah(v)}</span></li>)}{!catRev.size && <li className="text-ink-mute">Belum ada data.</li>}</ul></section></>);
}
