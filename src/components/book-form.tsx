"use client";
import { useActionState } from "react";
import { saveBook } from "@/actions/admin";
import { Field, Msg, Submit } from "./form-bits";
import { FileDrop } from "./file-drop";
type O = { id: string; name: string };
interface Book { id?: string; title?: string; isbn?: string | null; description?: string; author_id?: string | null; publisher_id?: string | null; publication_year?: number | null; pages?: number | null; language?: string; format?: string; weight_gram?: number; dimensions?: string | null; price?: number; sale_price?: number | null; education_level_id?: string | null; grade_id?: string | null; keywords?: string[]; status?: string; featured?: boolean }

const Sec = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <section className="card space-y-4 p-5 sm:p-6"><h2 className="flex items-center gap-3 text-lg"><span className="grid h-7 w-7 place-items-center rounded-pill bg-brand text-xs font-bold text-white">{n}</span>{title}</h2>{children}</section>
);

export function BookForm({ book = {}, authors, publishers, levels, grades, subjects, categories, selSubjects = [], selCategories = [] }: { book?: Book; authors: O[]; publishers: O[]; levels: O[]; grades: O[]; subjects: O[]; categories: O[]; selSubjects?: string[]; selCategories?: string[] }) {
  const [state, action] = useActionState(saveBook, null);
  const sel = (name: string, label: string, opts: O[], val?: string | null) => (
    <div><label htmlFor={name} className="label">{label}</label><select id={name} name={name} defaultValue={val ?? ""} className="input"><option value="">—</option>{opts.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>);
  const pills = (name: string, list: O[], selected: string[]) => <div className="flex flex-wrap gap-2">{list.map((s) => <label key={s.id} className="cursor-pointer"><input type="checkbox" name={name} value={s.id} defaultChecked={selected.includes(s.id)} className="peer sr-only" /><span className="chip peer-checked:border-brand peer-checked:bg-brand-light peer-checked:font-medium peer-checked:text-brand-dark peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marigold">{s.name}</span></label>)}</div>;
  return (
    <form action={action} className="space-y-5">
      {book.id && <input type="hidden" name="id" value={book.id} />}
      <Sec n={1} title="Informasi dasar">
        <Field name="title" label="Judul lengkap buku" state={state} defaultValue={book.title} required />
        <div className="grid gap-4 sm:grid-cols-2"><Field name="isbn" label="ISBN" state={state} defaultValue={book.isbn ?? ""} placeholder="978-602-..." />
          <div><label htmlFor="format" className="label">Format</label><select id="format" name="format" defaultValue={book.format ?? "PRINT"} className="input"><option value="PRINT">Buku cetak</option><option value="EBOOK">E-book</option><option value="MODULE">Modul digital</option></select></div></div>
        <div><label htmlFor="description" className="label">Deskripsi singkat</label><textarea id="description" name="description" rows={5} defaultValue={book.description} className="input" placeholder="Ringkasan materi dan capaian pembelajaran buku ini..." required />{state?.errors?.description && <p className="field-error">{state.errors.description[0]}</p>}</div>
        <Field name="keywords" label="Kata kunci (pisahkan koma)" state={state} defaultValue={book.keywords?.join(", ")} />
      </Sec>
      <Sec n={2} title="Klasifikasi & penulis">
        <div className="grid gap-4 sm:grid-cols-2">{sel("education_level_id", "Jenjang pendidikan", levels, book.education_level_id)}{sel("grade_id", "Kelas / tingkat", grades, book.grade_id)}{sel("author_id", "Penulis", authors, book.author_id)}{sel("publisher_id", "Penerbit", publishers, book.publisher_id)}</div>
        <fieldset><legend className="label">Mata pelajaran</legend>{pills("subjects", subjects, selSubjects)}</fieldset>
        <fieldset><legend className="label">Kategori</legend>{pills("categories", categories, selCategories)}</fieldset>
      </Sec>
      <Sec n={3} title="Harga & spesifikasi fisik">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field name="price" label="Harga normal (Rp)" type="number" state={state} defaultValue={book.price} required min={0} /><Field name="sale_price" label="Harga diskon (Rp)" type="number" state={state} defaultValue={book.sale_price ?? ""} min={0} /><Field name="weight_gram" label="Berat (gram)" type="number" state={state} defaultValue={book.weight_gram ?? 300} /><Field name="pages" label="Jumlah halaman" type="number" state={state} defaultValue={book.pages ?? ""} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field name="publication_year" label="Tahun terbit" type="number" state={state} defaultValue={book.publication_year ?? ""} /><Field name="dimensions" label="Dimensi" state={state} defaultValue={book.dimensions ?? ""} placeholder="21 x 29,7 cm" /><Field name="language" label="Bahasa" state={state} defaultValue={book.language ?? "Indonesia"} />{!book.id && <Field name="stock" label="Stok awal (eks)" type="number" state={state} defaultValue={0} min={0} />}</div>
      </Sec>
      <Sec n={4} title="Media">
        <div className="grid gap-4 md:grid-cols-2"><FileDrop name="cover" accept="image/jpeg,image/png,image/webp" label="Sampul depan (rasio 3:4)" optional note="JPG, PNG, atau WebP, maks 5 MB" error={state?.errors?.cover?.[0]} /><FileDrop name="digital_file" accept="application/pdf" label="File digital (PDF, privat)" optional note="PDF, maks 100 MB. Hanya pembeli yang bisa membaca." error={state?.errors?.digital_file?.[0]} /></div>
      </Sec>
      <Sec n={5} title="Status terbit">
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="status" className="label">Status</label><select id="status" name="status" defaultValue={book.status ?? "DRAFT"} className="input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Terbit</option><option value="ARCHIVED">Arsip</option></select></div>
          <label className="flex min-h-[44px] items-center gap-2 self-end text-sm"><input type="checkbox" name="featured" defaultChecked={book.featured} className="h-4 w-4 accent-[#1F3A5F]" /> Tampilkan sebagai buku unggulan</label></div>
      </Sec>
      <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 rounded-card border border-line bg-white/95 p-3 backdrop-blur"><Msg state={state} /><span className="flex-1" /><Submit>Simpan Buku</Submit></div>
    </form>
  );
}