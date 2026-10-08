import { createSupabaseAdmin } from "@/lib/supabase/server";
import { StockForm } from "@/components/stock-form";
export default async function Inventory() {
  const db = createSupabaseAdmin();
  const [{ data: inv }, { data: mv }] = await Promise.all([
    db.from("inventory").select("book_id,stock,reserved,low_stock_threshold,books!inner(title,format)").eq("books.format", "PRINT").order("stock"),
    db.from("inventory_movements").select("id,type,delta_stock,delta_reserved,note,created_at,books(title)").order("created_at", { ascending: false }).limit(25),
  ]);
  const total = (inv ?? []).reduce((s, i) => s + i.stock, 0);
  const lowN = (inv ?? []).filter((i) => i.stock - i.reserved > 0 && i.stock - i.reserved <= i.low_stock_threshold).length;
  const outN = (inv ?? []).filter((i) => i.stock - i.reserved <= 0).length;
  return (<><h1 className="mb-4 text-3xl font-bold">Inventori</h1>
    <div className="mb-4 grid grid-cols-3 gap-3"><div className="card p-3"><p className="text-xs text-ink-mute">Total stok</p><p className="text-xl font-bold">{total}</p></div><div className="card p-3"><p className="text-xs text-ink-mute">Menipis</p><p className="text-xl font-bold">{lowN}</p></div><div className="card p-3"><p className="text-xs text-ink-mute">Habis</p><p className="text-xl font-bold">{outN}</p></div></div>
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-brand-light"><tr><th className="p-3">Buku</th><th>Stok</th><th>Reservasi</th><th>Tersedia</th><th>Ubah stok</th></tr></thead><tbody>{inv?.map((i) => <tr key={i.book_id} className="border-t align-top"><td className="p-3">{(i.books as unknown as { title: string }).title}</td><td>{i.stock}</td><td>{i.reserved}</td><td>{i.stock - i.reserved}</td><td className="py-2"><StockForm bookId={i.book_id} /></td></tr>)}</tbody></table></div>
    <h2 className="mb-2 mt-6 text-xl font-bold">Riwayat pergerakan</h2><ul className="card divide-y text-sm">{mv?.map((m) => <li key={m.id} className="flex justify-between p-2"><span>{new Date(m.created_at).toLocaleString("id-ID")} · {(m.books as unknown as { title: string })?.title} · {m.type}{m.note ? ` (${m.note})` : ""}</span><span>{m.delta_stock !== 0 ? `stok ${m.delta_stock > 0 ? "+" : ""}${m.delta_stock}` : `reservasi ${m.delta_reserved > 0 ? "+" : ""}${m.delta_reserved}`}</span></li>)}</ul></>);
}
