import { createSupabaseServer } from "@/lib/supabase/server";
import { deleteAddress } from "@/actions/account";
import { AddressForm } from "@/components/address-form";
export const metadata = { title: "Alamat" };
export default async function Addresses() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("addresses").select("*").order("is_default", { ascending: false });
  return (<><h1 className="mb-4 text-3xl font-bold">Alamat</h1>
    <ul className="mb-6 space-y-2">{data?.map((a) => <li key={a.id} className="card flex items-start justify-between gap-3 p-3 text-sm"><span><strong>{a.recipient_name}</strong> · {a.phone}<br />{a.address_line}, {a.district}, {a.city}, {a.province} {a.postal_code}{a.latitude != null && <><br /><a className="text-brand underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}>Lihat titik di peta</a></>}</span><form action={deleteAddress.bind(null, a.id)}><button className="text-danger underline">Hapus</button></form></li>)}{!data?.length && <li className="text-sm text-ink-mute">Belum ada alamat.</li>}</ul>
    <h2 className="mb-2 text-xl font-bold">Tambah alamat</h2>
    <AddressForm /></>);
}