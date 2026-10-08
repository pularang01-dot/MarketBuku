import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createSupabaseServer } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Invoice", robots: { index: false } };

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/orders/${id}/invoice`);
  const supabase = await createSupabaseServer();
  const { data: o } = await supabase.from("orders").select("*, order_items(*)").eq("id", id).maybeSingle();
  if (!o) notFound();
  const a = o.shipping_address as Record<string, string>;
  return (
    <div className="mx-auto max-w-[780px]">
      <div className="mb-4 flex justify-end print:hidden"><PrintButton /></div>
      <div className="rounded-card border border-line bg-white p-8 sm:p-10 print:border-0 print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
          <div><p className="font-serif text-3xl font-semibold tracking-wide text-brand-dark">INVOICE</p><p className="mt-1 font-mono text-sm">{o.order_number}</p></div>
          <div className="text-right text-sm"><p className="font-serif text-lg font-semibold text-brand-dark">Toko Buku Edukasi</p><p className="text-ink-soft">{new Date(o.created_at).toLocaleDateString("id-ID", { dateStyle: "long" })}</p><p className="text-ink-soft">Status: {o.status}</p></div>
        </div>
        <div className="py-6 text-sm"><p className="text-xs font-bold uppercase tracking-wide text-ink-mute">Kepada</p><p className="mt-1 font-semibold">{a.recipient_name}</p><p className="text-ink-soft">{a.phone}<br />{a.address_line}, {a.district}, {a.city}, {a.province} {a.postal_code}</p></div>
        <table className="w-full text-sm"><thead><tr className="border-y border-line text-left text-xs uppercase tracking-wide text-ink-mute"><th className="py-2.5">Item</th><th className="text-center">Qty</th><th className="text-right">Harga</th><th className="text-right">Jumlah</th></tr></thead>
          <tbody>{o.order_items.map((i: { id: string; title_snapshot: string; quantity: number; price_snapshot: number }) => <tr key={i.id} className="border-b border-line"><td className="py-3 pr-3">{i.title_snapshot}</td><td className="text-center">{i.quantity}</td><td className="text-right">{formatRupiah(i.price_snapshot)}</td><td className="text-right">{formatRupiah(i.price_snapshot * i.quantity)}</td></tr>)}</tbody></table>
        <dl className="ml-auto mt-5 w-full max-w-xs space-y-1.5 text-sm"><div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatRupiah(o.subtotal)}</dd></div>{o.bundle_discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon paket</dt><dd>−{formatRupiah(o.bundle_discount)}</dd></div>}{o.discount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon kupon</dt><dd>−{formatRupiah(o.discount)}</dd></div>}<div className="flex justify-between"><dt className="text-ink-soft">Ongkos kirim</dt><dd>{formatRupiah(o.shipping_cost)}</dd></div><div className="flex justify-between border-t border-ink pt-2 text-base font-bold"><dt>Total</dt><dd>{formatRupiah(o.total)}</dd></div></dl>
        <p className="mt-10 text-center text-xs text-ink-mute">Terima kasih telah berbelanja di Toko Buku Edukasi.</p>
      </div>
    </div>
  );
}