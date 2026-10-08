import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { addTaxonomy } from "@/actions/admin";
import { SimpleForm } from "@/components/simple-form";
import { ConfirmButton, RenameInline } from "@/components/row-actions";
import { renameTaxonomy, deleteTaxonomy } from "@/actions/admin-content";
const ALLOWED = ["categories", "subjects", "grades", "authors", "publishers"];
export default async function Taxonomy({ params }: { params: Promise<{ taxonomy: string }> }) {
  const { taxonomy } = await params;
  if (!ALLOWED.includes(taxonomy)) notFound();
  const { data } = await createSupabaseAdmin().from(taxonomy).select("id,name,slug").order("name");
  return (<><h1 className="mb-4 text-3xl font-bold capitalize">{taxonomy}</h1><ul className="card mb-4 divide-y text-sm">{data?.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3"><RenameInline initial={r.name} action={renameTaxonomy.bind(null, taxonomy, r.id)} /><span className="text-ink-mute">{r.slug}</span><ConfirmButton label="Hapus" confirmText="Hapus item ini?" action={deleteTaxonomy.bind(null, taxonomy, r.id)} /></li>)}</ul>
    <SimpleForm action={addTaxonomy} cta="Tambah" fields={[{ name: "name", label: "Nama baru", required: true }]}><input type="hidden" name="table" value={taxonomy} /></SimpleForm></>);
}
