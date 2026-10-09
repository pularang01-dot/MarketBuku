import Link from "next/link";
import Image from "next/image";
import { Pencil, Plus, Search } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatRupiah, sanitizeSearch } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TabNav } from "@/components/tab-nav";
import { ConfirmButton } from "@/components/row-actions";
import { archiveBook } from "@/actions/admin-content";

const SIZE = 20;
const STATUS: Record<string, [string, string]> = { PUBLISHED: ["Terbit", "bg-leaf-light text-leaf"], DRAFT: ["Draft", "bg-surface-muted text-ink-soft"], ARCHIVED: ["Arsip", "bg-danger-light text-danger"] };

export default async function AdminBooks({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; status?: string }> }) {
  const sp = await searchParams; const page = Math.max(1, +(sp.page ?? 1) || 1);
  const db = createSupabaseAdmin();
  let q = db.from("books").select("id,title,isbn,cover_url,price,sale_price,status,format,author:authors(name),grade:grades(name),inventory(stock,reserved,low_stock_threshold)", { count: "exact" }).order("created_at", { ascending: false });
  if (sp.q) q = q.ilike("search_text", `%${sanitizeSearch(sp.q).toLowerCase()}%`);
  if (sp.status && sp.status in STATUS) q = q.eq("status", sp.status);
  const { data, count } = await q.range((page - 1) * SIZE, page * SIZE - 1);
  const pages = Math.max(1, Math.ceil((count ?? 0) / SIZE));
  const qs = (p: number) => { const u = new URLSearchParams(); if (sp.q) u.set("q", sp.q); if (sp.status) u.set("status", sp.status); u.set("page", String(p)); return `?${u}`; };
  return (
    <>
      <AdminPageHeader eyebrow="Katalog" title="Katalog Buku" subtitle="Kelola data buku, harga, dan status terbit."
        actions={<Link href="/admin/books/new" className="btn-primary"><Plus aria-hidden className="h-4 w-4" />Tambah Buku</Link>} />
      <TabNav label="Bagian katalog" active="/admin/books" tabs={[{ href: "/admin/books", label: "Daftar Buku" }, { href: "/admin/inventory", label: "Inventori & Stok" }, { href: "/admin/orders", label: "Pesanan" }]} />
      <form className="card mb-4 flex flex-wrap items-center gap-3 p-3"><div className="relative min-w-[220px] flex-1"><Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" /><label htmlFor="q" className="sr-only">Cari</label><input id="q" name="q" defaultValue={sp.q} placeholder="Cari berdasarkan judul, ISBN, atau penulis..." className="input pl-9" /></div>
        <label htmlFor="status" className="sr-only">Status</label><select id="status" name="status" defaultValue={sp.status ?? ""} className="input !w-44"><option value="">Semua status</option><option value="PUBLISHED">Terbit</option><option value="DRAFT">Draft</option><option value="ARCHIVED">Arsip</option></select><button className="btn-primary">Cari</button></form>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Sampul</th><th>Judul & ISBN</th><th>Jenjang</th><th>Harga</th><th>Stok</th><th>Status</th><th className="pr-4 text-right">Aksi</th></tr></thead>
        <tbody>{data?.map((b) => { const inv = (Array.isArray(b.inventory) ? b.inventory[0] : b.inventory) as { stock: number; reserved: number; low_stock_threshold: number } | null; const av = (inv?.stock ?? 0) - (inv?.reserved ?? 0); const low = b.format === "PRINT" && av <= (inv?.low_stock_threshold ?? 5); const st = STATUS[b.status];
          return (<tr key={b.id} className="border-t border-line align-middle">
            <td className="px-4 py-3"><div className="relative h-14 w-11 overflow-hidden rounded border border-line bg-surface-muted">{b.cover_url && <Image src={b.cover_url} alt="" fill sizes="44px" className="object-cover" />}</div></td>
            <td className="max-w-[320px] py-3 pr-3"><p className="font-serif text-base font-semibold leading-snug text-brand-dark">{b.title}</p><p className="text-xs text-ink-mute">ISBN {b.isbn ?? "—"} · {(b.author as unknown as { name: string } | null)?.name ?? "—"}</p></td>
            <td>{(b.grade as unknown as { name: string } | null)?.name ? <span className="badge bg-brand-light text-brand">{(b.grade as unknown as { name: string }).name}</span> : "—"}</td>
            <td><p className="font-semibold">{formatRupiah(b.sale_price ?? b.price)}</p>{b.sale_price != null && <p className="text-xs text-ink-mute line-through">{formatRupiah(b.price)}</p>}</td>
            <td>{b.format !== "PRINT" ? <span className="badge bg-leaf-light text-leaf">Digital</span> : <><p className="font-semibold">{inv?.stock ?? 0} eks</p><p className={`text-xs ${av <= 0 ? "text-danger" : low ? "text-marigold-dark" : "text-leaf"}`}>{av <= 0 ? "Habis" : low ? `Kritis, tersedia ${av}` : `Tersedia ${av}`}</p></>}</td>
            <td><span className={`badge ${st[1]}`}>{st[0]}</span></td>
            <td className="pr-4 text-right"><span className="inline-flex items-center gap-3"><Link href={`/admin/books/${b.id}`} aria-label={`Ubah ${b.title}`} className="grid h-9 w-9 place-items-center rounded-ctl text-ink-soft hover:bg-brand-light hover:text-brand"><Pencil className="h-4 w-4" /></Link>{b.status !== "ARCHIVED" && <ConfirmButton label="Arsipkan" confirmText="Arsipkan buku? Buku hilang dari toko, riwayat pesanan tetap aman." action={archiveBook.bind(null, b.id)} className="text-xs text-danger underline" />}</span></td></tr>); })}
          {!data?.length && <tr><td colSpan={7} className="p-8 text-center text-ink-mute">Tidak ada buku.</td></tr>}</tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-soft">Menampilkan <strong>{data?.length ?? 0}</strong> dari <strong>{count ?? 0}</strong> judul buku · halaman {page} dari {pages}</p>
        <div className="flex gap-2">{page > 1 && <Link className="btn-ghost !min-h-[38px]" href={qs(page - 1)}>Sebelumnya</Link>}{page < pages && <Link className="btn-ghost !min-h-[38px]" href={qs(page + 1)}>Berikutnya</Link>}</div></div>
    </>
  );
}