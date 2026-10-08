import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { markAllRead } from "@/actions/notifications";
export const metadata = { title: "Notifikasi" };
const LABEL: Record<string, string> = { order: "Pesanan", payment: "Pembayaran", shipping: "Pengiriman", promotion: "Promo", wishlist: "Wishlist", restock: "Stok", recommendation: "Rekomendasi" };
export default async function Notifications() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
  return (<><div className="mb-4 flex items-center justify-between"><h1 className="text-3xl font-bold">Notifikasi</h1><form action={markAllRead}><button className="btn-ghost">Tandai semua dibaca</button></form></div>
    {!data?.length ? <p className="card p-6 text-ink-soft">Belum ada notifikasi.</p> : <ul className="space-y-2">{data.map((n) => <li key={n.id} className={`card p-3 text-sm ${n.read ? "" : "border-l-4 border-marigold"}`}><span className="badge bg-brand-light text-brand">{LABEL[n.type]}</span> <Link href={n.link ?? "#"} className="font-semibold">{n.title}</Link><p className="text-ink-soft">{n.body}</p><p className="text-xs text-ink-mute">{new Date(n.created_at).toLocaleString("id-ID")}</p></li>)}</ul>}</>);
}
