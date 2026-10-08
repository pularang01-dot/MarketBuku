import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Backpack, GraduationCap, School, ShieldCheck, Landmark, MonitorSmartphone } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getSavedIds } from "@/lib/saved";
import { forYou } from "@/lib/recommendations";
import { BookCard } from "@/components/book-card";
import { SearchBox } from "@/components/search-box";
import { BOOK_SELECT, type BookRow } from "@/types";
import { formatRupiah } from "@/lib/utils";

export const revalidate = 0;

function Section({ title, subtitle, href, hrefLabel = "Lihat semua", children }: { title: string; subtitle?: string; href?: string; hrefLabel?: string; children: React.ReactNode }) {
  return (
    <section className="mt-14">
      <div className="mb-5 flex items-end justify-between gap-4"><div><h2 className="text-2xl sm:text-[28px]">{title}</h2>{subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}</div>
        {href && <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">{hrefLabel}<ArrowRight aria-hidden className="h-4 w-4" /></Link>}</div>
      {children}
    </section>
  );
}
const Grid = ({ books, saved, notes }: { books: BookRow[]; saved: Set<string>; notes?: Map<string, string> }) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{books.map((b) => <BookCard key={b.id} book={b} saved={saved.has(b.id)} note={notes?.get(b.id)} />)}</div>
);
const LEVEL_ICON: Record<string, React.ReactNode> = { sd: <Backpack aria-hidden className="h-6 w-6" />, smp: <School aria-hidden className="h-6 w-6" />, sma: <GraduationCap aria-hidden className="h-6 w-6" /> };
const LEVEL_RANGE: Record<string, string> = { sd: "Kelas 1 sampai 6", smp: "Kelas 7 sampai 9", sma: "Kelas 10 sampai 12", umum: "Guru, orang tua, dan umum" };

export default async function Home() {
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const [best, fresh, rec, saved, levels, subjects, bundles, articles, grades] = await Promise.all([
    supabase.from("books").select(BOOK_SELECT).eq("status", "PUBLISHED").order("sold_count", { ascending: false }).limit(4),
    supabase.from("books").select(BOOK_SELECT).eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(4),
    forYou(user?.id ?? null, 4),
    getSavedIds(),
    supabase.from("education_levels").select("id,name,slug").order("sort"),
    supabase.from("subjects").select("name,slug").order("name").limit(12),
    supabase.from("bundles").select("title,slug,price,description").eq("status", "PUBLISHED").limit(3),
    supabase.from("articles").select("title,slug,excerpt,category,published_at").eq("status", "PUBLISHED").order("published_at", { ascending: false }).limit(3),
    supabase.from("grades").select("name,slug").order("sort"),
  ]);
  const counts = await Promise.all((levels.data ?? []).map(async (l) => ({ id: l.id, n: (await supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").eq("education_level_id", l.id)).count ?? 0 })));
  const countBy = new Map(counts.map((c) => [c.id, c.n]));
  const heroBooks = ((best.data ?? []) as unknown as BookRow[]).slice(0, 3);
  const notes = new Map(rec.items.map((r) => [r.book.id, r.reasons[0]]));

  return (
    <>
      {/* HERO */}
      <section className="card grid items-center gap-8 overflow-hidden p-6 sm:p-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="badge bg-brand-light text-brand">Katalog buku pelajaran & referensi</p>
          <h1 className="mt-4 text-[32px] leading-[38px] sm:text-[40px] sm:leading-[48px]">Temukan Buku yang Tepat untuk Perjalanan Belajarmu</h1>
          <p className="mt-3 max-w-lg text-ink-soft">Buku pelajaran, latihan soal, persiapan ujian, dan referensi guru untuk SD, SMP, dan SMA, dipilih sesuai jenjang dan kebutuhan belajar.</p>
          <div className="mt-6 max-w-xl"><SearchBox large /></div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm"><span className="text-ink-mute">Populer:</span>
            {[["SD", "/books?level=sd"], ["SMP", "/books?level=smp"], ["SMA", "/books?level=sma"], ["Persiapan Ujian", "/books?category=persiapan-ujian"], ["Referensi Guru", "/books?category=referensi-guru"], ["Modul Digital", "/books?format=MODULE"]].map(([l, h]) => <Link key={l} href={h} className="chip !min-h-[30px] text-xs">{l}</Link>)}</div>
        </div>
        <div className="relative mx-auto hidden h-72 w-full max-w-sm lg:block" aria-hidden>
          {heroBooks.map((b, i) => (
            <div key={b.id} className="absolute w-40 overflow-hidden rounded-card border border-line bg-white p-2" style={{ left: `${i * 26}%`, top: `${i % 2 === 0 ? 8 : 40}px`, zIndex: i, boxShadow: "0 4px 16px -2px rgba(20,35,58,.08)" }}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-muted">{b.cover_url ? <Image src={b.cover_url} alt="" fill sizes="160px" className="object-cover" /> : <div className="grid h-full place-items-center p-2 text-center font-serif text-xs text-brand">{b.title}</div>}</div>
            </div>))}
        </div>
      </section>

      {/* JENJANG */}
      <Section title="Belanja Berdasarkan Jenjang" subtitle="Pilih jenjang pendidikan untuk menemukan buku yang sesuai.">
        <div className="grid gap-4 md:grid-cols-3">
          {(levels.data ?? []).filter((l) => l.slug !== "umum").map((l) => (
            <Link key={l.id} href={`/books?level=${l.slug}`} className="card group flex flex-col gap-3 p-5 transition hover:border-brand hover:shadow-float">
              <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-card bg-brand-light text-brand">{LEVEL_ICON[l.slug]}</span><span className="badge bg-surface-muted text-ink-soft">{countBy.get(l.id) ?? 0} judul buku</span></div>
              <h3 className="text-xl">{l.name}</h3><p className="text-sm text-ink-soft">{LEVEL_RANGE[l.slug]}</p>
              <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand">Lihat koleksi<ArrowRight aria-hidden className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-ink-mute">Mata pelajaran:</span>
          {(subjects.data ?? []).map((s) => <Link key={s.slug} href={`/subjects/${s.slug}`} className="chip text-xs">{s.name}</Link>)}</div>
      </Section>

      <Section title="Buku Terlaris" subtitle="Paling banyak dipesan siswa, guru, dan orang tua." href="/books?sort=popular"><Grid books={(best.data ?? []) as unknown as BookRow[]} saved={saved} /></Section>
      <Section title={rec.personalised ? "Rekomendasi untukmu" : "Sedang populer"} subtitle={rec.personalised ? "Berdasarkan preferensi, wishlist, dan riwayatmu." : "Masuk dan atur preferensi belajar untuk rekomendasi yang lebih pas."}><Grid books={rec.items.map((r) => r.book)} saved={saved} notes={notes} /></Section>

      {/* FINDER STRIP */}
      <section className="panel mt-14 p-5 sm:p-6">
        <form action="/book-finder" className="flex flex-wrap items-end gap-3">
          <div className="mr-auto min-w-[220px]"><h2 className="text-xl">Cari Buku Sesuai Kebutuhan</h2><p className="text-sm text-ink-soft">Pilih jenjang, kelas, dan mata pelajaran untuk rekomendasi yang tepat.</p></div>
          {[["level", "Jenjang", levels.data ?? []], ["grade", "Kelas", grades.data ?? []], ["subject", "Mata pelajaran", subjects.data ?? []]].map(([n, l, o]) => (
            <div key={n as string}><label htmlFor={`h-${n}`} className="label !mb-1 text-xs">{l as string}</label><select id={`h-${n}`} name={n as string} className="input !w-44"><option value="">Semua</option>{(o as { name: string; slug: string }[]).map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</select></div>))}
          <button className="btn-primary">Tampilkan Rekomendasi</button>
        </form>
      </section>

      <Section title="Buku Terbaru" subtitle="Judul yang baru masuk ke katalog." href="/books?sort=newest"><Grid books={(fresh.data ?? []) as unknown as BookRow[]} saved={saved} /></Section>

      {!!bundles.data?.length && (
        <Section title="Paket Edukasi Hemat" subtitle="Beli lengkap dalam satu paket dengan harga lebih hemat." href="/bundles">
          <div className="grid gap-4 md:grid-cols-3">{bundles.data.map((b) => (
            <div key={b.slug} className="card flex flex-col p-5"><span className="badge w-fit bg-marigold-light text-marigold-dark">Paket hemat</span><h3 className="mt-3 text-lg">{b.title}</h3><p className="mt-1 line-clamp-2 text-sm text-ink-soft">{b.description}</p>
              <div className="mt-auto flex items-end justify-between pt-4"><p className="text-lg font-bold text-brand">{formatRupiah(b.price)}</p><Link href={`/bundles/${b.slug}`} className="btn-primary !min-h-[40px]">Lihat Paket</Link></div></div>))}</div>
        </Section>)}

      {!!articles.data?.length && (
        <Section title="Artikel & Wawasan Belajar" subtitle="Panduan memilih buku dan tips belajar efektif." href="/articles" hrefLabel="Semua artikel">
          <div className="grid gap-4 md:grid-cols-3">{articles.data.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="card flex flex-col p-5 transition hover:border-brand hover:shadow-float"><span className="badge w-fit bg-brand-light text-brand">{a.category ?? "Artikel"}</span><h3 className="mt-3 text-lg leading-snug">{a.title}</h3><p className="mt-2 line-clamp-3 text-sm text-ink-soft">{a.excerpt}</p>
              <p className="mt-auto pt-4 text-xs text-ink-mute">{a.published_at && new Date(a.published_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p></Link>))}</div>
        </Section>)}

      {/* TRUST */}
      <section className="mt-14 grid gap-3 md:grid-cols-3">
        {[[ShieldCheck, "Buku asli & terkurasi", "Katalog dipilih untuk kebutuhan sekolah, guru, dan orang tua."], [Landmark, "Pembayaran transfer terverifikasi", "Transfer ke rekening toko; admin memverifikasi bukti pembayaranmu."], [MonitorSmartphone, "E-book di perpustakaan digital", "Buku digital langsung tersedia setelah pembayaran diverifikasi."]].map(([Icon, t, d]) => {
          const I = Icon as typeof ShieldCheck;
          return <div key={t as string} className="card flex items-start gap-3 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-ctl bg-brand-light text-brand"><I aria-hidden className="h-5 w-5" /></span><div><p className="font-semibold">{t as string}</p><p className="mt-0.5 text-sm text-ink-soft">{d as string}</p></div></div>;
        })}
      </section>
    </>
  );
}