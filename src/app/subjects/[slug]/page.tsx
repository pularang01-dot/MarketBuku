import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/catalog-view";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { CatalogParams } from "@/lib/catalog";

async function load(slug: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("subjects").select("name,slug").eq("slug", slug).maybeSingle();
  return data;
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await load((await params).slug);
  return t ? { title: `Buku ${t.name}`, alternates: { canonical: `/subjects/${t.slug}` }, description: `Daftar buku ${t.name} di Toko Buku Edukasi.` } : {};
}
export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<CatalogParams> }) {
  const { slug } = await params;
  const t = await load(slug);
  if (!t) notFound();
  return (<><nav aria-label="Breadcrumb" className="mb-2 text-sm text-ink-mute"><Link href="/books">Katalog</Link> / {t.name}</nav><h1 className="mb-4 text-3xl font-bold">{t.name}</h1><CatalogView sp={await searchParams} base={`/subjects/${slug}`} fixed={{ subject: slug }} /></>);
}