import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { jsonLd, SITE_URL } from "@/lib/utils";
import Image from "next/image";
import { Breadcrumb } from "@/components/breadcrumb";
import { BookGrid } from "@/components/book-card";
import { BOOK_SELECT, type BookRow } from "@/types";

async function load(slug: string) { const s = await createSupabaseServer(); return (await s.from("articles").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle()).data; }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = await load((await params).slug); if (!a) return {};
  return { title: a.seo_title ?? a.title, description: a.seo_description ?? a.excerpt ?? undefined, alternates: { canonical: `/articles/${a.slug}` }, openGraph: { type: "article", title: a.seo_title ?? a.title } };
}
export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const a = await load((await params).slug);
  if (!a) notFound();
  const supabase = await createSupabaseServer();
  const { data: rel } = a.related_book_ids?.length ? await supabase.from("books").select(BOOK_SELECT).in("id", a.related_book_ids).eq("status", "PUBLISHED") : { data: [] };
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: a.title, datePublished: a.published_at, author: { "@type": "Person", name: a.author_name }, mainEntityOfPage: `${SITE_URL}/articles/${a.slug}` };
  // Content is rendered as escaped plain-text paragraphs (no raw HTML) => no XSS surface.
  return (<article className="mx-auto max-w-[720px]"><Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/articles", label: "Artikel" }, { label: a.title }]} />{a.cover_url && <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-card"><Image src={a.cover_url} alt="" fill sizes="672px" className="object-cover" priority /></div>}<span className="badge bg-brand-light text-brand">{a.category ?? "Artikel"}</span><h1 className="mt-3 text-4xl leading-tight">{a.title}</h1><p className="mt-1 text-sm text-ink-mute">{a.author_name} · {a.published_at && new Date(a.published_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p><div className="mt-6 space-y-5 font-serif text-lg leading-[30px] text-ink-soft">{a.content.split(/\n{2,}/).map((p: string, i: number) => <p key={i}>{p}</p>)}</div>{!!rel?.length && <section className="mt-10"><h2 className="mb-3 text-2xl font-bold">Buku yang disebut di artikel ini</h2><BookGrid books={rel as unknown as BookRow[]} /></section>}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} /></article>);
}