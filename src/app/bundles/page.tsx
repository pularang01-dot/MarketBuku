import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
export const metadata: Metadata = { title: "Paket Edukasi", alternates: { canonical: "/bundles" } };
export default async function Bundles() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("bundles").select("title,slug,description,price").eq("status", "PUBLISHED");
  return (<><h1 className="mb-4 text-3xl font-bold">Paket Edukasi</h1>{!data?.length ? <p className="card p-8 text-center text-ink-soft">Belum ada paket.</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((b) => <Link key={b.slug} href={`/bundles/${b.slug}`} className="card p-5 hover:shadow-lift"><h2 className="text-xl font-bold">{b.title}</h2><p className="mt-1 text-sm text-ink-soft">{b.description}</p><p className="mt-3 text-lg font-bold">{formatRupiah(b.price)}</p></Link>)}</div>}</>);
}
