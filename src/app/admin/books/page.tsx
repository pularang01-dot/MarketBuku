import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah, sanitizeSearch } from "@/lib/utils";
const SIZE = 20;
export default async function AdminBooks({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, +(sp.page ?? 1) || 1);
  let q = createSupabaseAdmin().from("books").select("id,title,price,sale_price,status,format,inventory(stock,reserved)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.q) q = q.ilike("search_text", `%${sanitizeSearch(sp.q).toLowerCase()}%`);
  const { data, count } = await q.range((page - 1) * SIZE, page * SIZE - 1);
  return (<><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-3xl font-bold">Buku</h1><Link href="/admin/books/new" className="btn-primary">Tambah Buku</Link></div>
    <form className="mb-3"><label htmlFor="q" className="sr-only">Cari</label><input id="q" name="q" defaultValue={sp.q} placeholder="Cari judul / ISBN" className="input max-w-sm" /></form>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light"><tr><th className="p-3">Judul</th><th>Harga</th><th>Stok</th><th>Status</th><th /></tr></thead><tbody>{data?.map((b) => { const inv = (Array.isArray(b.inventory) ? b.inventory[0] : b.inventory) as { stock: number; reserved: number } | null; return (<tr key={b.id} className="border-t"><td className="p-3">{b.title}</td><td>{formatRupiah(b.sale_price ?? b.price)}</td><td>{b.format === "PRINT" ? `${(inv?.stock ?? 0) - (inv?.reserved ?? 0)}` : "digital"}</td><td>{b.status}</td><td><Link className="text-brand underline" href={`/admin/books/${b.id}`}>Ubah</Link></td></tr>); })}{!data?.length && <tr><td className="p-6 text-center text-ink-mute" colSpan={5}>Tidak ada buku.</td></tr>}</tbody></table></div>
    <p className="mt-2 text-sm text-ink-mute">{count ?? 0} buku · halaman {page}</p>
    <div className="mt-2 flex gap-2">{page > 1 && <Link className="btn-ghost" href={`?page=${page - 1}${sp.q ? `&q=${sp.q}` : ""}`}>Sebelumnya</Link>}{(count ?? 0) > page * SIZE && <Link className="btn-ghost" href={`?page=${page + 1}${sp.q ? `&q=${sp.q}` : ""}`}>Berikutnya</Link>}</div></>);
}
