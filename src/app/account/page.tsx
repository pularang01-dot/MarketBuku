import Link from "next/link";
import { Bell, Heart, Package } from "lucide-react";
import { getProfile } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
export const metadata = { title: "Akun Saya" };
export default async function Account() {
  const p = await getProfile();
  const supabase = await createSupabaseServer();
  const active = ["PENDING_PAYMENT", "PAID", "PROCESSING", "PACKED", "SHIPPED"];
  const [{ data: notes }, wl, ord, unread] = await Promise.all([
    supabase.from("notifications").select("id,title,body,link,read,created_at").order("created_at", { ascending: false }).limit(6),
    supabase.from("wishlist_items").select("book_id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("status", active),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  const stats = [[Package, "Pesanan aktif", ord.count ?? 0, "/orders"], [Heart, "Wishlist", wl.count ?? 0, "/account/wishlist"], [Bell, "Notifikasi baru", unread.count ?? 0, "/account/notifications"]] as const;
  return (<>
    <div className="mb-6 flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand text-xl font-bold text-white">{(p?.full_name ?? "U").slice(0, 1).toUpperCase()}</span><div><h1 className="text-3xl">Halo, {p?.full_name}</h1><p className="text-sm text-ink-soft">{p?.email}</p></div></div>
    <div className="grid gap-3 sm:grid-cols-3">{stats.map(([Icon, label, n, href]) => <Link key={label} href={href} className="card flex items-center gap-3 p-4 transition hover:border-brand"><span className="grid h-11 w-11 place-items-center rounded-ctl bg-brand-light text-brand"><Icon aria-hidden className="h-5 w-5" /></span><span><span className="block text-2xl font-bold text-brand-dark">{n}</span><span className="text-xs text-ink-soft">{label}</span></span></Link>)}</div>
    <section className="card mt-6 p-5"><h2 className="text-xl">Notifikasi terbaru</h2>{!notes?.length ? <p className="mt-2 text-sm text-ink-mute">Belum ada notifikasi.</p> : <ul className="mt-3 space-y-2">{notes.map((n) => <li key={n.id} className={`rounded-card bg-paper p-3 text-sm ${n.read ? "" : "border-l-4 border-l-marigold"}`}><Link href={n.link ?? "#"} className="font-semibold text-brand-dark hover:underline">{n.title}</Link><p className="text-ink-soft">{n.body}</p></li>)}</ul>}</section>
  </>);
}