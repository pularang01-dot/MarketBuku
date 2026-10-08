import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { BundleForm } from "@/components/bundle-form";
import { ConfirmButton } from "@/components/row-actions";
import { deleteBundle } from "@/actions/admin-content";
import { formatRupiah } from "@/lib/utils";
export default async function AdminBundles() {
  const db = createSupabaseAdmin();
  const [{ data: bundles }, { data: books }] = await Promise.all([db.from("bundles").select("id,title,price,status").order("created_at", { ascending: false }), db.from("books").select("id,title").eq("status", "PUBLISHED").order("title")]);
  return (<><h1 className="mb-4 text-3xl font-bold">Paket</h1><ul className="card mb-6 divide-y text-sm">{bundles?.map((b) => <li key={b.id} className="flex items-center justify-between p-3"><span>{b.title} · {formatRupiah(b.price)} · {b.status}</span><span className="flex gap-3"><Link className="text-brand underline" href={`/admin/bundles/${b.id}`}>Ubah</Link><ConfirmButton label="Hapus" confirmText="Hapus paket ini?" action={deleteBundle.bind(null, b.id)} /></span></li>)}{!bundles?.length && <li className="p-3 text-ink-mute">Belum ada paket.</li>}</ul>
    <h2 className="mb-2 text-xl font-bold">Paket baru</h2><BundleForm books={books ?? []} /></>);
}
