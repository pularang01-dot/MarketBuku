import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
export const metadata = { title: "Ulasan Saya" };
export default async function MyReviews() {
  const user = await getUser(); const supabase = await createSupabaseServer();
  const { data } = await supabase.from("reviews").select("id,rating,body,status,book:books(title)").eq("user_id", user!.id).order("created_at", { ascending: false });
  return (<><h1 className="mb-4 text-3xl font-bold">Ulasan Saya</h1>{!data?.length ? <p className="card p-6 text-ink-soft">Kamu belum menulis ulasan. Ulasan bisa ditulis dari halaman buku yang sudah kamu beli.</p> : <ul className="space-y-2">{data.map((r) => <li key={r.id} className="card p-3 text-sm"><strong>{(r.book as unknown as { title: string }).title}</strong> · {"★".repeat(r.rating)} <span className="badge bg-brand-light text-brand">{r.status === "APPROVED" ? "Tayang" : r.status === "PENDING" ? "Menunggu moderasi" : "Disembunyikan"}</span><p className="mt-1 text-ink-soft">{r.body}</p></li>)}</ul>}</>);
}
