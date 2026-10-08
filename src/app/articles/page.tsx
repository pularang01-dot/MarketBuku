import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
export const metadata: Metadata = { title: "Artikel Edukasi", description: "Tips belajar dan panduan memilih buku untuk siswa, orang tua, dan guru.", alternates: { canonical: "/articles" } };
export default async function Articles() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("articles").select("title,slug,excerpt,category,published_at").eq("status", "PUBLISHED").order("published_at", { ascending: false });
  return (<><h1 className="mb-4 text-3xl font-bold">Artikel Edukasi</h1>{!data?.length ? <p className="card p-8 text-center text-ink-soft">Belum ada artikel.</p> : <ul className="grid gap-4 sm:grid-cols-2">{data.map((a) => <li key={a.slug}><Link href={`/articles/${a.slug}`} className="card block p-5 hover:shadow-lift"><p className="text-xs text-ink-mute">{a.category}</p><h2 className="text-xl font-bold">{a.title}</h2><p className="mt-1 text-sm text-ink-soft">{a.excerpt}</p></Link></li>)}</ul>}</>);
}
