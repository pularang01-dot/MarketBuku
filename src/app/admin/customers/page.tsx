import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
export default async function Customers() {
  const db = createSupabaseAdmin();
  const paid = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED"];
  const [{ data: users }, { data: orders }] = await Promise.all([db.from("profiles").select("id,full_name,created_at").eq("role", "USER").order("created_at", { ascending: false }).limit(100), db.from("orders").select("user_id,total").in("status", paid)]);
  const agg = new Map<string, { n: number; t: number }>(); (orders ?? []).forEach((o) => { const c = agg.get(o.user_id) ?? { n: 0, t: 0 }; c.n++; c.t += o.total; agg.set(o.user_id, c); });
  return (<><h1 className="mb-4 text-3xl font-bold">Pelanggan</h1><div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light"><tr><th className="p-3">Nama</th><th>Bergabung</th><th>Pesanan</th><th>Total belanja</th></tr></thead><tbody>{users?.map((u) => <tr key={u.id} className="border-t"><td className="p-3"><Link className="text-brand underline" href={`/admin/customers/${u.id}`}>{u.full_name}</Link></td><td>{new Date(u.created_at).toLocaleDateString("id-ID")}</td><td>{agg.get(u.id)?.n ?? 0}</td><td>{formatRupiah(agg.get(u.id)?.t ?? 0)}</td></tr>)}</tbody></table></div><p className="mt-2 text-xs text-ink-mute">Email dan kontak tidak ditampilkan untuk meminimalkan data sensitif.</p></>);
}