import { Boxes, TriangleAlert, ClipboardList } from "lucide-react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { StockForm } from "@/components/stock-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { TabNav } from "@/components/tab-nav";

const MOVE: Record<string, string> = { purchase: "Penjualan", reserve: "Reservasi", release: "Pelepasan", adjustment: "Koreksi stok", return: "Retur", cancellation: "Pembatalan", restock: "Restock" };

export default async function Inventory() {
  const db = createSupabaseAdmin();
  const [{ data: inv }, { data: mv }] = await Promise.all([
    db.from("inventory").select("book_id,stock,reserved,low_stock_threshold,books!inner(title,isbn,format)").eq("books.format", "PRINT").order("stock"),
    db.from("inventory_movements").select("id,type,delta_stock,delta_reserved,note,created_at,books(title)").order("created_at", { ascending: false }).limit(12),
  ]);
  const total = (inv ?? []).reduce((s, i) => s + i.stock, 0);
  const reserved = (inv ?? []).reduce((s, i) => s + i.reserved, 0);
  const lowN = (inv ?? []).filter((i) => i.stock - i.reserved > 0 && i.stock - i.reserved <= i.low_stock_threshold).length;
  const outN = (inv ?? []).filter((i) => i.stock - i.reserved <= 0).length;
  const cards = [[Boxes, "Total stok fisik", `${total} eksemplar`, `${inv?.length ?? 0} judul buku cetak`], [TriangleAlert, "Peringatan menipis", `${lowN} judul`, `${outN} judul sudah habis`], [ClipboardList, "Reservasi aktif", `${reserved} eksemplar`, "Dikunci untuk pesanan belum lunas"]] as const;
  return (
    <>
      <AdminPageHeader eyebrow="Katalog" title="Inventori & Stok" subtitle="Pantau stok fisik, reservasi pesanan, dan catat setiap perubahan stok." />
      <TabNav label="Bagian katalog" active="/admin/inventory" tabs={[{ href: "/admin/books", label: "Daftar Buku" }, { href: "/admin/inventory", label: "Inventori & Stok", count: lowN + outN }, { href: "/admin/orders", label: "Pesanan" }]} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{cards.map(([Icon, l, v, n]) => <div key={l} className="card flex items-start justify-between p-4"><div><p className="text-[11px] font-bold uppercase tracking-wide text-ink-mute">{l}</p><p className="mt-2 font-serif text-2xl font-semibold text-brand-dark">{v}</p><p className="mt-1 text-xs text-ink-mute">{n}</p></div><span className="grid h-9 w-9 place-items-center rounded-ctl bg-brand-light text-brand"><Icon aria-hidden className="h-[18px] w-[18px]" /></span></div>)}</div>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light/60 text-xs uppercase tracking-wide text-ink-soft"><tr><th className="px-4 py-3">Buku</th><th>Stok</th><th>Reservasi</th><th>Tersedia</th><th>Ubah stok</th></tr></thead><tbody>
          {inv?.map((i) => { const b = i.books as unknown as { title: string; isbn: string | null }; const av = i.stock - i.reserved; return <tr key={i.book_id} className="border-t border-line align-top"><td className="px-4 py-3"><p className="font-serif font-semibold text-brand-dark">{b.title}</p><p className="text-xs text-ink-mute">ISBN {b.isbn ?? "—"}</p></td><td className="py-3 font-semibold">{i.stock}</td><td className="py-3">{i.reserved}</td><td className="py-3"><span className={`badge ${av <= 0 ? "bg-danger-light text-danger" : av <= i.low_stock_threshold ? "bg-marigold-light text-marigold-dark" : "bg-leaf-light text-leaf"}`}>{av <= 0 ? "Habis" : av <= i.low_stock_threshold ? `Sisa ${av}` : av}</span></td><td className="py-3 pr-4"><StockForm bookId={i.book_id} /></td></tr>; })}</tbody></table></section>
        <section className="card h-fit p-4"><h2 className="text-lg">Log Mutasi Stok</h2><ul className="mt-3 space-y-2">{mv?.map((m) => { const d = m.delta_stock !== 0 ? m.delta_stock : m.delta_reserved; return <li key={m.id} className="rounded-card bg-paper p-3 text-sm"><div className="flex justify-between gap-2"><span className="font-semibold">{MOVE[m.type] ?? m.type}</span><span className={`font-bold ${d >= 0 ? "text-leaf" : "text-danger"}`}>{d > 0 ? "+" : ""}{d} eks</span></div><p className="truncate text-xs text-ink-soft">{(m.books as unknown as { title: string })?.title}{m.note ? ` · ${m.note}` : ""}</p><p className="text-[11px] text-ink-mute">{new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}{m.delta_stock === 0 ? " · reservasi" : ""}</p></li>; })}{!mv?.length && <li className="text-sm text-ink-mute">Belum ada mutasi.</li>}</ul></section>
      </div>
    </>
  );
}