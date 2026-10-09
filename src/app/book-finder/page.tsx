import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, SlidersHorizontal, SearchX } from "lucide-react";
import { getTaxonomy } from "@/lib/catalog";
import { finder } from "@/lib/recommendations";
import { QuickAdd } from "@/components/quick-add";
import { stockInfo } from "@/components/book-card";
import { PageHeader } from "@/components/page-header";
import { formatRupiah } from "@/lib/utils";
import Image from "next/image";

export const metadata: Metadata = { title: "Cari Buku Sesuai Kebutuhan Belajar", description: "Jawab empat langkah singkat dan dapatkan rekomendasi buku dari katalog kami.", alternates: { canonical: "/book-finder" } };
const GOALS: [string, string, string][] = [["belajar", "Belajar mandiri", "Penjelasan konsep dan materi pokok."], ["latihan", "Latihan soal", "Soal bertingkat dan pembahasan."], ["ujian", "Persiapan ujian", "Simulasi dan ringkasan materi ujian."], ["mengajar", "Panduan guru", "Perangkat dan referensi mengajar."], ["literasi", "Literasi & bacaan", "Penumbuh minat baca dan nalar."], ["referensi", "Referensi", "Bahan rujukan lengkap."]];

function Radio({ name, value, checked, children, className = "" }: { name: string; value: string; checked: boolean; children: React.ReactNode; className?: string }) {
  return (<label className="cursor-pointer"><input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" /><span className={`block rounded-ctl border border-line bg-white text-sm text-ink-soft transition peer-checked:border-brand peer-checked:bg-brand-light peer-checked:font-semibold peer-checked:text-brand-dark peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marigold hover:border-brand ${className}`}>{children}</span></label>);
}

export default async function BookFinder({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tax = await getTaxonomy();
  const answered = !!(sp.level || sp.grade || sp.subject || sp.goal);
  const results = answered ? await finder({ level: sp.level, grade: sp.grade, subject: sp.subject, goal: sp.goal }) : [];
  const nm = (l: { name: string; slug: string }[], v?: string) => l.find((x) => x.slug === v)?.name;
  const criteria = [nm(tax.levels, sp.level), nm(tax.grades, sp.grade), nm(tax.subjects, sp.subject), GOALS.find((g) => g[0] === sp.goal)?.[1]].filter(Boolean) as string[];
  const num = (n: number, t: string, aside: string) => <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-pill bg-brand text-xs font-bold text-white">{n}</span>{t}</p><span className="text-xs text-ink-mute">{aside}</span></div>;
  return (
    <>
      <PageHeader title="Cari Buku Sesuai Kebutuhan Belajar" subtitle="Jawab empat langkah singkat; kami mencocokkannya dengan katalog yang tersedia." crumbs={[{ href: "/", label: "Beranda" }, { label: "Cari Buku" }]} />
      <form className="card mx-auto max-w-4xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line p-5"><span className="grid h-10 w-10 place-items-center rounded-pill bg-brand text-white"><SlidersHorizontal aria-hidden className="h-5 w-5" /></span><div><p className="font-serif text-lg font-semibold text-brand-dark">Panduan Pemilihan Buku</p><p className="text-xs text-ink-soft">Sesuaikan jenjang, kelas, mata pelajaran, dan tujuan belajar</p></div></div>
        <div className="space-y-6 p-5 sm:p-6">
          <fieldset>{num(1, "Jenjang pendidikan", "Pilih satu")}<div className="grid gap-3 sm:grid-cols-3">{tax.levels.map((l) => <Radio key={l.slug} name="level" value={l.slug} checked={sp.level === l.slug} className="px-4 py-3">{l.name}</Radio>)}</div></fieldset>
          <fieldset>{num(2, "Tingkat kelas", "Opsional")}<div className="flex flex-wrap gap-2">{tax.grades.map((g) => <Radio key={g.slug} name="grade" value={g.slug} checked={sp.grade === g.slug} className="rounded-pill px-4 py-1.5">{g.name}</Radio>)}</div></fieldset>
          <fieldset>{num(3, "Mata pelajaran utama", "Opsional")}<div className="flex flex-wrap gap-2">{tax.subjects.map((s) => <Radio key={s.slug} name="subject" value={s.slug} checked={sp.subject === s.slug} className="rounded-pill px-4 py-1.5">{s.name}</Radio>)}</div></fieldset>
          <fieldset>{num(4, "Tujuan pembelajaran", "Opsional")}<div className="grid gap-3 sm:grid-cols-3">{GOALS.map(([v, t, d]) => <Radio key={v} name="goal" value={v} checked={sp.goal === v} className="p-4"><span className="block">{t}</span><span className="mt-0.5 block text-xs font-normal text-ink-soft">{d}</span></Radio>)}</div></fieldset>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper p-4"><p className="text-xs text-ink-soft">{criteria.length ? <>Kriteria aktif: <strong>{criteria.join(" · ")}</strong></> : "Belum ada kriteria dipilih."}</p><div className="flex gap-2"><Link href="/book-finder" className="btn-subtle">Atur Ulang</Link><button className="btn-primary">Tampilkan Rekomendasi Buku</button></div></div>
      </form>

      {answered && (
        <section className="mt-10" aria-live="polite">
          <span className="badge bg-brand-light text-brand">Hasil kurasi terkomputasi</span>
          <h2 className="mt-2 text-2xl">Hasil Rekomendasi{criteria.length ? ` untuk ${criteria.slice(0, 3).join(" · ")}` : ""}</h2>
          {!results.length ? (
            <div className="card mt-4 grid place-items-center gap-3 p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand-light text-brand"><SearchX aria-hidden className="h-7 w-7" /></span><h3 className="text-xl">Belum ada buku yang cukup cocok</h3><p className="max-w-md text-sm text-ink-soft">Coba longgarkan pilihanmu, misalnya kosongkan kelas atau mata pelajaran.</p><Link href="/book-finder" className="btn-ghost">Atur Ulang Pilihan</Link></div>
          ) : (
            <><p className="mb-4 mt-1 text-sm text-ink-soft">Menampilkan {results.length} buku dengan tingkat kecocokan tertinggi.</p>
              <div className="grid gap-4 md:grid-cols-3">{results.map((r) => { const b = r.book; const s = stockInfo(b); const price = b.sale_price ?? b.price;
                return (<article key={b.id} className="card flex flex-col p-4">
                  <Link href={`/books/${b.slug}`} className="relative block aspect-[3/4] overflow-hidden rounded-lg border border-line bg-surface-muted">{b.cover_url ? <Image src={b.cover_url} alt={`Sampul ${b.title}`} fill sizes="(max-width:768px) 100vw, 330px" className="object-cover" /> : <span className="grid h-full place-items-center p-4 text-center font-serif text-brand">{b.title}</span>}</Link>
                  <p className="mt-3 flex items-start gap-2 rounded-ctl bg-leaf-light px-3 py-2 text-xs text-leaf"><CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>{Math.round(r.score * 100)}% cocok</strong> — {r.reasons.join(", ")}</span></p>
                  <h3 className="mt-3 text-lg leading-snug"><Link href={`/books/${b.slug}`}>{b.title}</Link></h3><p className="text-xs text-ink-soft">{b.author?.name}</p>
                  <div className="mt-auto flex items-center justify-between pt-3"><p className="text-lg font-bold text-brand">{formatRupiah(price)}</p><span className={`badge ${s.tone}`}>{s.label}</span></div>
                  <div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/books/${b.slug}`} className="btn-ghost !min-h-[40px] text-sm">Lihat Detail</Link><QuickAdd bookId={b.id} disabled={s.out} /></div></article>); })}</div></>
          )}
        </section>
      )}
    </>
  );
}