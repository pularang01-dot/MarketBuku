"use client";
import { useActionState } from "react";
import { saveBook } from "@/actions/admin";
import { Field, Msg, Submit } from "./form-bits";
type O = { id: string; name: string };
interface Book { id?: string; title?: string; isbn?: string | null; description?: string; author_id?: string | null; publisher_id?: string | null; publication_year?: number | null; pages?: number | null; language?: string; format?: string; weight_gram?: number; dimensions?: string | null; price?: number; sale_price?: number | null; education_level_id?: string | null; grade_id?: string | null; keywords?: string[]; status?: string; featured?: boolean }

export function BookForm({ book = {}, authors, publishers, levels, grades, subjects, categories, selSubjects = [], selCategories = [] }: { book?: Book; authors: O[]; publishers: O[]; levels: O[]; grades: O[]; subjects: O[]; categories: O[]; selSubjects?: string[]; selCategories?: string[] }) {
  const [state, action] = useActionState(saveBook, null);
  const sel = (name: string, label: string, opts: O[], val?: string | null) => (
    <div><label htmlFor={name} className="label">{label}</label><select id={name} name={name} defaultValue={val ?? ""} className="input"><option value="">—</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>);
  return (
    <form action={action} className="card space-y-4 p-4">
      {book.id && <input type="hidden" name="id" value={book.id} />}
      <Field name="title" label="Judul" state={state} defaultValue={book.title} required />
      <div><label htmlFor="description" className="label">Deskripsi</label><textarea id="description" name="description" rows={5} defaultValue={book.description} className="input !py-2" required />{state?.errors?.description && <p className="field-error">{state.errors.description[0]}</p>}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="isbn" label="ISBN" state={state} defaultValue={book.isbn ?? ""} />
        <div><label htmlFor="format" className="label">Format</label><select id="format" name="format" defaultValue={book.format ?? "PRINT"} className="input"><option value="PRINT">Cetak</option><option value="EBOOK">E-book</option><option value="MODULE">Modul digital</option></select></div>
        {sel("author_id", "Penulis", authors, book.author_id)}{sel("publisher_id", "Penerbit", publishers, book.publisher_id)}
        {sel("education_level_id", "Jenjang", levels, book.education_level_id)}{sel("grade_id", "Kelas", grades, book.grade_id)}
        <Field name="price" label="Harga (Rp)" type="number" state={state} defaultValue={book.price} required min={0} />
        <Field name="sale_price" label="Harga diskon (Rp)" type="number" state={state} defaultValue={book.sale_price ?? ""} min={0} />
        <Field name="publication_year" label="Tahun terbit" type="number" state={state} defaultValue={book.publication_year ?? ""} />
        <Field name="pages" label="Halaman" type="number" state={state} defaultValue={book.pages ?? ""} />
        <Field name="weight_gram" label="Berat (gram)" type="number" state={state} defaultValue={book.weight_gram ?? 300} />
        <Field name="dimensions" label="Dimensi" state={state} defaultValue={book.dimensions ?? ""} placeholder="21 x 29,7 cm" />
        <Field name="language" label="Bahasa" state={state} defaultValue={book.language ?? "Indonesia"} />
        {!book.id && <Field name="stock" label="Stok awal" type="number" state={state} defaultValue={0} min={0} />}
        <Field name="keywords" label="Kata kunci (pisahkan koma)" state={state} defaultValue={book.keywords?.join(", ")} />
        <div><label htmlFor="status" className="label">Status</label><select id="status" name="status" defaultValue={book.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="ARCHIVED">Arsip</option></select></div>
      </div>
      <fieldset><legend className="label">Mata pelajaran</legend><div className="flex flex-wrap gap-2">{subjects.map((s) => <label key={s.id} className="flex min-h-[40px] items-center gap-2 rounded-pill border px-3 text-sm"><input type="checkbox" name="subjects" value={s.id} defaultChecked={selSubjects.includes(s.id)} />{s.name}</label>)}</div></fieldset>
      <fieldset><legend className="label">Kategori</legend><div className="flex flex-wrap gap-2">{categories.map((s) => <label key={s.id} className="flex min-h-[40px] items-center gap-2 rounded-pill border px-3 text-sm"><input type="checkbox" name="categories" value={s.id} defaultChecked={selCategories.includes(s.id)} />{s.name}</label>)}</div></fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label htmlFor="cover" className="label">Sampul (JPG/PNG/WebP, maks 5 MB)</label><input id="cover" name="cover" type="file" accept="image/jpeg,image/png,image/webp" />{state?.errors?.cover && <p className="field-error">{state.errors.cover[0]}</p>}</div>
        <div><label htmlFor="digital_file" className="label">File digital (PDF, privat)</label><input id="digital_file" name="digital_file" type="file" accept="application/pdf" />{state?.errors?.digital_file && <p className="field-error">{state.errors.digital_file[0]}</p>}</div>
      </div>
      <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" name="featured" defaultChecked={book.featured} /> Tampilkan sebagai unggulan</label>
      <Msg state={state} /><Submit>Simpan Buku</Submit>
    </form>
  );
}