"use client";
import { useActionState } from "react";
import { updateArticle } from "@/actions/admin-content";
import { Field, Msg, Submit } from "./form-bits";
interface A { id: string; title: string; excerpt: string | null; content: string; category: string | null; status: string; seo_title: string | null; seo_description: string | null; related_book_ids: string[] }
export function ArticleForm({ a, books }: { a: A; books: { id: string; title: string }[] }) {
  const [s, run] = useActionState(updateArticle, null);
  return (<form action={run} className="card space-y-3 p-4"><input type="hidden" name="id" value={a.id} />
    <Field name="title" label="Judul" state={s} defaultValue={a.title} required /><Field name="excerpt" label="Ringkasan" state={s} defaultValue={a.excerpt ?? ""} /><Field name="category" label="Kategori" state={s} defaultValue={a.category ?? ""} />
    <div><label htmlFor="content" className="label">Isi (teks biasa; paragraf dipisah baris kosong)</label><textarea id="content" name="content" rows={12} defaultValue={a.content} className="input !py-2" required /></div>
    <Field name="seo_title" label="SEO title" state={s} defaultValue={a.seo_title ?? ""} /><Field name="seo_description" label="SEO description" state={s} defaultValue={a.seo_description ?? ""} />
    <div><label htmlFor="cover" className="label">Sampul artikel</label><input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />{s?.errors?.cover && <p className="field-error">{s.errors.cover[0]}</p>}</div>
    <fieldset><legend className="label">Buku terkait (maks 6)</legend><div className="grid gap-1 sm:grid-cols-2">{books.map((b) => <label key={b.id} className="flex min-h-[40px] items-center gap-2 text-sm"><input type="checkbox" name="related" value={b.id} defaultChecked={a.related_book_ids.includes(b.id)} />{b.title}</label>)}</div></fieldset>
    <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" defaultValue={a.status} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option></select></div><Msg state={s} /><Submit>Simpan</Submit></form>);
}