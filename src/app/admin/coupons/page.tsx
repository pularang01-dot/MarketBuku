import { createSupabaseAdmin } from "@/lib/supabase/server";
import { saveCoupon } from "@/actions/admin";
import { SimpleForm } from "@/components/simple-form";
import { toggleCoupon } from "@/actions/admin-content";
export default async function Coupons() {
  const { data } = await createSupabaseAdmin().from("coupons").select("*").order("created_at", { ascending: false });
  return (<><h1 className="mb-4 text-3xl font-bold">Kupon</h1><div className="card mb-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light"><tr><th className="p-3">Kode</th><th>Jenis</th><th>Nilai</th><th>Min. belanja</th><th>Terpakai</th><th>Berakhir</th><th>Aktif</th></tr></thead><tbody>{data?.map((c) => <tr key={c.id} className="border-t"><td className="p-3 font-mono">{c.code}</td><td>{c.type}</td><td>{c.value}</td><td>{c.min_purchase}</td><td>{c.used_count}/{c.usage_limit ?? "∞"}</td><td>{c.ends_at ? new Date(c.ends_at).toLocaleDateString("id-ID") : "-"}</td><td><form action={toggleCoupon.bind(null, c.id, !c.active)}><button className="text-brand underline">{c.active ? "Nonaktifkan" : "Aktifkan"}</button></form></td></tr>)}</tbody></table></div>
    <h2 className="mb-2 text-xl font-bold">Kupon baru</h2>
    <SimpleForm action={saveCoupon} cta="Buat kupon" fields={[{ name: "code", label: "Kode", required: true }, { name: "value", label: "Nilai (persen atau Rp; 0 untuk gratis ongkir)", type: "number", required: true }, { name: "min_purchase", label: "Minimal belanja (Rp)", type: "number", defaultValue: "0" }, { name: "usage_limit", label: "Batas total pemakaian", type: "number" }, { name: "per_user_limit", label: "Batas per pengguna", type: "number", defaultValue: "1" }, { name: "ends_at", label: "Berakhir", type: "date" }]}>
      <div><label htmlFor="type" className="label">Jenis</label><select id="type" name="type" className="input"><option value="PERCENT">Persen</option><option value="FIXED">Nominal</option><option value="FREE_SHIPPING">Gratis ongkir</option></select></div></SimpleForm></>);
}
