import Link from "next/link";
import { SearchX, X } from "lucide-react";
import { queryBooks, getTaxonomy, type CatalogParams } from "@/lib/catalog";
import { getSavedIds } from "@/lib/saved";
import { BookCard } from "./book-card";
import { Filters } from "./filters";
import { Pagination } from "./pagination";
import { SortSelect } from "./sort-select";

const LABELS: Record<string, string> = { q: "Kata kunci", level: "Jenjang", grade: "Kelas", subject: "Mapel", category: "Kategori", format: "Format", min: "Harga min", max: "Harga maks", rating: "Rating", available: "Tersedia" };
const FORMATS: Record<string, string> = { PRINT: "Buku cetak", EBOOK: "E-book", MODULE: "Modul digital" };

export async function CatalogView({ sp, base, fixed = {} }: { sp: CatalogParams; base: string; fixed?: Partial<CatalogParams> }) {
  const merged = { ...sp, ...fixed };
  const [res, tax, saved] = await Promise.all([queryBooks(merged), getTaxonomy(), getSavedIds()]);
  const name = (list: { name: string; slug: string }[], v: string) => list.find((x) => x.slug === v)?.name ?? v;
  const active = (Object.keys(LABELS) as (keyof CatalogParams)[]).filter((k) => sp[k] && !(k in fixed)).map((k) => {
    const v = sp[k]!;
    const text = k === "level" ? name(tax.levels, v) : k === "grade" ? name(tax.grades, v) : k === "subject" ? name(tax.subjects, v) : k === "category" ? name(tax.categories, v) : k === "format" ? FORMATS[v] ?? v : k === "available" ? "Tersedia saja" : k === "rating" ? `${v}★ ke atas` : v;
    const u = new URLSearchParams(); Object.entries(sp).forEach(([kk, vv]) => vv && kk !== k && kk !== "page" && u.set(kk, vv));
    return { k, text, href: `${base}${u.toString() ? `?${u}` : ""}` };
  });
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <details className="card p-3 lg:hidden"><summary className="btn-ghost cursor-pointer list-none">Filter & urutkan</summary><div className="mt-3"><Filters tax={tax} sp={sp} action={base} /></div></details>
      <aside className="hidden lg:block"><div className="sticky top-36"><Filters tax={tax} sp={sp} action={base} /></div></aside>
      <section aria-live="polite" className="min-w-0">
        <div className="card mb-4 space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-serif text-xl font-semibold text-brand-dark">{res.total} buku ditemukan{sp.q && <> untuk <em>&ldquo;{sp.q}&rdquo;</em></>}</p>
            <SortSelect />
          </div>
          {active.length > 0 && (
            <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-ink-mute">Filter aktif:</span>
              {active.map((a) => <Link key={a.k} href={a.href} className="chip chip-active !min-h-[30px] text-xs" aria-label={`Hapus filter ${LABELS[a.k]}: ${a.text}`}>{a.text}<X aria-hidden className="h-3 w-3" /></Link>)}
              <Link href={base} className="text-xs font-medium text-danger hover:underline">Reset semua</Link></div>
          )}
        </div>
        {res.error ? <p role="alert" className="card p-6 text-danger">Katalog gagal dimuat. Muat ulang halaman.</p>
          : !res.books.length ? (
            <div className="card grid place-items-center gap-3 p-10 text-center"><span className="grid h-14 w-14 place-items-center rounded-pill bg-brand-light text-brand"><SearchX aria-hidden className="h-7 w-7" /></span>
              <h2 className="text-xl">Buku tidak ditemukan</h2><p className="max-w-md text-sm text-ink-soft">Tidak ada buku yang cocok dengan kombinasi filter ini. Coba kurangi filter atau ganti kata kunci.</p>
              <div className="flex flex-wrap justify-center gap-2"><Link href={base} className="btn-primary">Reset Semua Filter</Link><Link href="/book-finder" className="btn-ghost">Cari Buku Sesuai Kebutuhan</Link></div></div>
          ) : <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">{res.books.map((b) => <BookCard key={b.id} book={b} saved={saved.has(b.id)} />)}</div>}
        <Pagination page={res.page} pages={res.pages} params={merged as Record<string, string | undefined>} base={base} total={res.total} />
      </section>
    </div>
  );
}