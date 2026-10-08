"use client";
import { useActionState, useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { placeOrder, getShippingRates } from "@/actions/checkout";
import { Field, Msg, Submit } from "./form-bits";
import { AddressFields, type AddrValue } from "./address-fields";
import { formatRupiah } from "@/lib/utils";

type Rate = { courier: string; service: string; label: string; cost: number; etaDays: string };
type Addr = AddrValue;
interface Item { id: string; title: string; quantity: number; total: number; digital: boolean }

const Step = ({ n, title, aside }: { n: number; title: string; aside?: React.ReactNode }) => (
  <div className="mb-4 flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-xl"><span className="grid h-8 w-8 place-items-center rounded-pill bg-brand text-sm font-bold text-white">{n}</span>{title}</h2>{aside}</div>
);

export function CheckoutForm({ items, subtotal, bundleDiscount, hasPhysical, addresses, defaultName }: { items: Item[]; subtotal: number; bundleDiscount: number; hasPhysical: boolean; addresses: (Addr & { id: string })[]; defaultName: string }) {
  const [state, action] = useActionState(placeOrder, null);
  const [addr, setAddr] = useState<Partial<Addr>>(addresses[0] ?? { recipient_name: defaultName });
  const [rates, setRates] = useState<Rate[]>([]);
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateErr, setRateErr] = useState("");

  useEffect(() => {
    if (!hasPhysical || !addr.city || !addr.postal_code || addr.postal_code.length !== 5) return;
    let alive = true; setLoading(true); setRateErr("");
    getShippingRates(addr.city, addr.postal_code).then((r) => { if (alive) { setRates(r); setRate(""); } }).catch(() => alive && setRateErr("Gagal memuat ongkir.")).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [addr.city, addr.postal_code, hasPhysical]);

  const shipping = rates.find((r) => `${r.courier}:${r.service}` === rate)?.cost ?? 0;
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <section className="card p-5 sm:p-6"><Step n={1} title="Alamat Pengiriman" aside={<span className="badge bg-leaf-light text-leaf">{hasPhysical ? "Buku fisik" : "Produk digital"}</span>} />
          {addresses.length > 0 && <div className="mb-4"><label className="label" htmlFor="saved">Gunakan alamat tersimpan</label><select id="saved" className="input" onChange={(e) => { const a = addresses.find((x) => x.id === e.target.value); if (a) setAddr(a); }}>{addresses.map((a) => <option key={a.id} value={a.id}>{a.recipient_name} — {a.city}</option>)}</select></div>}
          <AddressFields value={addr} onChange={(patch) => setAddr((a) => ({ ...a, ...patch }))} state={state} />
        </section>

        <section className="card p-5 sm:p-6"><Step n={2} title="Opsi Pengiriman" />
          {!hasPhysical ? <p className="panel p-4 text-sm text-ink-soft">Pesananmu hanya berisi produk digital — tidak ada ongkir. Akses tersedia di Perpustakaan Digital setelah pembayaran diverifikasi.</p> : (
            <fieldset aria-busy={loading}><legend className="sr-only">Layanan pengiriman</legend>
              {loading && <p className="text-sm text-ink-soft">Memuat ongkir...</p>}{rateErr && <p role="alert" className="field-error">{rateErr}</p>}
              {!loading && !rates.length && <p className="panel p-4 text-sm text-ink-soft">Isi kota dan kode pos (atau pilih titik di peta) untuk melihat pilihan pengiriman.</p>}
              <div className="space-y-2">{rates.map((r) => { const v = `${r.courier}:${r.service}`; return (
                <label key={v} className="flex min-h-[56px] cursor-pointer items-center gap-3 rounded-card border border-line bg-white p-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand-light"><input type="radio" name="shipping" value={v} checked={rate === v} onChange={() => setRate(v)} required className="h-4 w-4 accent-[#1F3A5F]" /><span className="flex-1"><span className="block font-semibold">{r.label}</span><span className="block text-xs text-ink-soft">Estimasi {r.etaDays}</span></span><strong className="text-brand">{formatRupiah(r.cost)}</strong></label>); })}</div>
            </fieldset>)}
        </section>

        <section className="card p-5 sm:p-6"><Step n={3} title="Kupon Diskon" />
          <Field name="coupon" label="Kode kupon (opsional)" state={state} placeholder="mis. BELAJAR10" autoCapitalize="characters" />
          <p className="mt-2 text-xs text-ink-mute">Kupon diverifikasi oleh sistem saat pesanan dibuat; potongan final tampil di rincian pesanan.</p>
        </section>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-40"><h2 className="flex items-center justify-between text-xl">Ringkasan Pesanan <span className="badge bg-surface-muted text-ink-soft">{items.reduce((s, i) => s + i.quantity, 0)} buku</span></h2>
        <ul className="space-y-2">{items.map((i) => <li key={i.id} className="flex items-start justify-between gap-3 rounded-card bg-paper p-3 text-sm"><span className="min-w-0"><span className="line-clamp-1 font-medium">{i.title}</span><span className="text-xs text-ink-mute">{i.quantity}× {i.digital ? "E-book / modul" : "Buku cetak"}</span></span><span className="shrink-0 font-semibold">{formatRupiah(i.total)}</span></li>)}</ul>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-soft">Subtotal produk</dt><dd>{formatRupiah(subtotal)}</dd></div>
          {bundleDiscount > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Diskon paket</dt><dd className="text-leaf">−{formatRupiah(bundleDiscount)}</dd></div>}
          <div className="flex justify-between"><dt className="text-ink-soft">Ongkos kirim</dt><dd>{hasPhysical ? (rate ? formatRupiah(shipping) : "—") : "Gratis"}</dd></div>
        </dl>
        <div className="rounded-card bg-brand-light p-4"><p className="text-xs text-ink-soft">Perkiraan total tagihan</p><p className="text-2xl font-bold text-brand-dark">{formatRupiah(subtotal - bundleDiscount + shipping)}</p><p className="mt-1 text-xs text-ink-soft">Diskon kupon dihitung final oleh sistem.</p></div>
        <p className="rounded-card bg-paper p-3 text-xs text-ink-soft">Pembayaran dilakukan lewat <strong>transfer bank manual</strong>. Setelah pesanan dibuat, kamu akan diarahkan ke halaman pembayaran untuk mengunggah bukti transfer.</p>
        <Msg state={state} /><Submit className="btn-primary w-full"><Lock aria-hidden className="h-4 w-4" />Buat Pesanan & Bayar</Submit>
      </aside>
    </form>
  );
}