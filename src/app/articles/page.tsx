import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BookCard } from "@/components/book-card";
import { getSavedIds } from "@/lib/saved";
import { BOOK_SELECT, type BookRow } from "@/types";

export const metadata: Metadata = { title: "Artikel & Wawasan Pendidikan", description: "Tips belajar dan panduan memilih buku untuk siswa, orang tua, dan guru.", alternates: { canonical: "/articles" } };
const readTime = (t: string) => `${Math.max(1, Math.round(t.trim().split(/\s+/).length / 200))} menit baca`;

type A = { title: string; slug: string; excerpt: string | null; category: string | null; published_at: string | null; cover_url: string | null; content: string; author_name: string | null; related_book_ids: string[] };

function Cover({ a, className }: { a: A; className: string }) {
  return <div className={`relative overflow-hidden bg-brand-light ${className}`}>{a.cover_url ? <Image src={a.cover_url} alt="" fill sizes="(max-width:768px) 100vw, 400px" className="object-cover" /> : <span className="absolute inset-0 grid place-items-center p-4 text-center font-serif text-brand">{a.category ?? "Artikel"}</span>}</div>;
}

export default async function Articles({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("articles").select("title,slug,excerpt,category,published_at,cover_url,content,author_name,related_book_ids").eq("status", "PUBLISHED").order("published_at", { ascending: false });
  const all = (data ?? []) as A[];
  const cats = [...new Set(all.map((a) => a.category).filter(Boolean))] as string[];
  const list = cat ? all.filter((a) => a.category === cat) : all;
  const [feat, ...rest] = list;
  const ids = [...new Set(list.flatMap((a) => a.related_book_ids ?? []))].slice(0, 4);
  const [{ data: rel }, saved] = await Promise.all([ids.length ? supabase.from("books").select(BOOK_SELECT).in("id", ids).eq("status", "PUBLISHED") : Promise.resolve({ data: [] }), getSavedIds()]);
  return (
    <>
      <PageHeader title="Artikel & Wawasan Pendidikan" subtitle="Panduan memilih buku, tips belajar efektif, dan strategi menghadapi ujian." crumbs={[{ href: "/", label: "Beranda" }, { label: "Artikel" }]} />
      <div className="mb-6 flex flex-wrap gap-2"><Link href="/articles" className={`chip ${!cat ? "chip-active" : ""}`}>Semua Artikel</Link>{cats.map((c) => <Link key={c} href={`/articles?cat=${encodeURIComponent(c)}`} className={`chip ${cat === c ? "chip-active" : ""}`}>{c}</Link>)}</div>
      {!feat ? <p className="card p-10 text-center text-ink-soft">Belum ada artikel.</p> : (
        <>
          <article className="card grid overflow-hidden md:grid-cols-[1fr_1.1fr]"><Link href={`/articles/${feat.slug}`} aria-hidden tabIndex={-1}><Cover a={feat} className="h-56 md:h-full md:min-h-[280px]" /></Link>
            <div className="flex flex-col p-6 sm:p-8"><div className="flex flex-wrap items-center gap-2 text-xs"><span className="badge bg-leaf-light text-leaf">{feat.category ?? "Artikel"}</span><span className="flex items-center gap-1 text-ink-mute"><Clock aria-hidden className="h-3.5 w-3.5" />{readTime(feat.content)}</span></div>
              <h2 className="mt-3 text-2xl leading-snug sm:text-[28px]"><Link href={`/articles/${feat.slug}`}>{feat.title}</Link></h2><p className="mt-3 line-clamp-4 text-ink-soft">{feat.excerpt}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5"><p className="text-xs text-ink-mute">{feat.author_name ?? "Redaksi"} · {feat.published_at && new Date(feat.published_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p><Link href={`/articles/${feat.slug}`} className="btn-primary">Baca Selengkapnya<ArrowRight aria-hidden className="h-4 w-4" /></Link></div></div></article>
          {rest.length > 0 && <section className="mt-10"><h2 className="text-2xl">Kumpulan Artikel Pilihan</h2><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{rest.map((a) => (
            <Link key={a.slug} href={`/articles/${a.slug}`} className="card flex flex-col overflow-hidden transition hover:border-brand hover:shadow-float"><Cover a={a} className="h-40" />
              <div className="flex flex-1 flex-col p-4"><div className="flex items-center justify-between text-xs"><span className="badge bg-brand-light text-brand">{a.category ?? "Artikel"}</span><span className="text-ink-mute">{readTime(a.content)}</span></div><h3 className="mt-2 line-clamp-2 text-lg leading-snug">{a.title}</h3><p className="mt-1 line-clamp-3 text-sm text-ink-soft">{a.excerpt}</p><p className="mt-auto pt-3 text-xs text-ink-mute">{a.published_at && new Date(a.published_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p></div></Link>))}</div></section>}
        </>)}
      {!!rel?.length && <section className="mt-12"><h2 className="text-2xl">Buku Terkait Referensi Bacaan</h2><p className="mb-4 mt-1 text-sm text-ink-soft">Buku yang dirujuk langsung dalam artikel di atas.</p><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{(rel as unknown as BookRow[]).map((b) => <BookCard key={b.id} book={b} saved={saved.has(b.id)} />)}</div></section>}
    </>
  );
}