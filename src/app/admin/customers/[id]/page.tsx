import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const db = createSupabaseAdmin();
  const { data: p } = await db.from("profiles").select("id,full_name,role,created_at").eq("id", id).maybeSingle();
  if (!p) notFound();
  const paid = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];
  const [{ data: orders }, { data: wl }, { data: rv }, { data: ev }] = await Promise.all([
    db.from("orders").select("order_number,total,status,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("wishlist_items").select("book:books(title)").eq("user_id", id).limit(10),
    db.from("reviews").select("rating,status,book:books(title)").eq("user_id", id).limit(10),
    db.from("user_events").select("type,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
  ]);
  const spend = (orders ?? []).filter((o) => paid.includes(o.status)).reduce((s, o) => s + o.total, 0);
  const t = (x: unknown) => (x as { title: string })?.title;
  return (<><h1 className="text-3xl font-bold">{p.full_name}</h1><p className="text-sm text-ink-mute">Bergabung {new Date(p.created_at).toLocaleDateString("id-ID")} · {orders?.length ?? 0} pesanan · belanja {formatRupiah(spend)}</p>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <section className="card p-4"><h2 className="font-bold">Pesanan terakhir</h2><ul className="mt-2 text-sm">{orders?.map((o) => <li key={o.order_number} className="flex justify-between"><span>{o.order_number} · {o.status}</span><span>{formatRupiah(o.total)}</span></li>)}</ul></section>
      <section className="card p-4"><h2 className="font-bold">Ringkasan wishlist</h2><ul className="mt-2 text-sm">{wl?.map((w, i) => <li key={i}>{t(w.book)}</li>)}{!wl?.length && <li className="text-ink-mute">Kosong</li>}</ul></section>
      <section className="card p-4"><h2 className="font-bold">Ulasan</h2><ul className="mt-2 text-sm">{rv?.map((r, i) => <li key={i}>{t(r.book)} · {"★".repeat(r.rating)} ({r.status})</li>)}{!rv?.length && <li className="text-ink-mute">Belum ada</li>}</ul></section>
      <section className="card p-4"><h2 className="font-bold">Aktivitas terbaru</h2><ul className="mt-2 text-sm">{ev?.map((e, i) => <li key={i}>{e.type} · {new Date(e.created_at).toLocaleDateString("id-ID")}</li>)}</ul></section>
    </div></>);
}
