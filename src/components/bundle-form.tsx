"use client";
import { useActionState } from "react";
import { saveBundle } from "@/actions/admin-content";
import { Field, Msg, Submit } from "./form-bits";
export function BundleForm({ books, bundle, selected = [] }: { books: { id: string; title: string }[]; bundle?: { id: string; title: string; description: string | null; price: number; status: string }; selected?: string[] }) {
  const [s, a] = useActionState(saveBundle, null);
  return (<form action={a} className="card space-y-3 p-4">
    {bundle && <input type="hidden" name="id" value={bundle.id} />}
    <Field name="title" label="Judul paket" state={s} defaultValue={bundle?.title} required />
    <Field name="description" label="Deskripsi" state={s} defaultValue={bundle?.description ?? ""} />
    <Field name="price" label="Harga paket (Rp)" type="number" state={s} defaultValue={bundle?.price} required min={0} />
    <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" defaultValue={bundle?.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="ARCHIVED">Arsip</option></select></div>
    <fieldset><legend className="label">Isi paket (min. 2 buku)</legend><div className="grid gap-1 sm:grid-cols-2">{books.map((b) => <label key={b.id} className="flex min-h-[40px] items-center gap-2 text-sm"><input type="checkbox" name="books" value={b.id} defaultChecked={selected.includes(b.id)} />{b.title}</label>)}</div></fieldset>
    <Msg state={s} /><Submit>Simpan paket</Submit></form>);
}
