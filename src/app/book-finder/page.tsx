import type { Metadata } from "next";
import { getTaxonomy } from "@/lib/catalog";
import { finder } from "@/lib/recommendations";
import { BookCard } from "@/components/book-card";
import { getSavedIds } from "@/lib/saved";

export const metadata: Metadata = { title: "Cari Buku Sesuai Kebutuhan", description: "Jawab beberapa pertanyaan singkat dan dapatkan rekomendasi buku dari katalog kami.", alternates: { canonical: "/book-finder" } };

export default async function BookFinder({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tax = await getTaxonomy();
  const answered = sp.level || sp.grade || sp.subject || sp.goal;
  const [results, saved] = await Promise.all([answered ? finder({ level: sp.level, grade: sp.grade, subject: sp.subject, goal: sp.goal }) : Promise.resolve([]), getSavedIds()]);
  const sel = (n: string, l: string, o: { name: string; slug: string }[]) => <div><label className="label" htmlFor={n}>{l}</label><select id={n} name={n} defaultValue={sp[n] ?? ""} className="input"><option value="">Belum tahu</option>{o.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></div>;
  return (
    <><h1 className="text-3xl font-bold">Cari Buku Sesuai Kebutuhan</h1><p className="mt-1 text-ink-soft">Jawab beberapa pertanyaan, kami cocokkan dengan katalog yang tersedia.</p>
      <form className="card mt-4 grid gap-3 p-4 sm:grid-cols-2">
        {sel("level", "Jenjang", tax.levels)}{sel("grade", "Kelas", tax.grades)}{sel("subject", "Mata pelajaran", tax.subjects)}
        <div><label className="label" htmlFor="goal">Tujuan</label><select id="goal" name="goal" defaultValue={sp.goal ?? ""} className="input"><option value="">Belum tahu</option><option value="belajar">Belajar</option><option value="latihan">Latihan soal</option><option value="ujian">Persiapan ujian</option><option value="mengajar">Mengajar</option><option value="referensi">Referensi</option><option value="literasi">Literasi</option></select></div>
        <button className="btn-primary sm:col-span-2">Tampilkan Rekomendasi</button>
      </form>
      {answered && <section className="mt-8" aria-live="polite"><h2 className="text-2xl font-bold">Rekomendasi</h2>{!results.length ? <p className="card mt-3 p-6 text-ink-soft">Belum ada buku yang cukup cocok. Coba longgarkan pilihanmu.</p> : <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">{results.map((r) => <BookCard key={r.book.id} book={r.book} saved={saved.has(r.book.id)} note={`${Math.round(r.score * 100)}% cocok — ${r.reasons.join(", ")}`} />)}</div>}</section>}
    </>
  );
}
