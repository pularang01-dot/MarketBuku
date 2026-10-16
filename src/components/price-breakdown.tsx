import { formatRupiah } from "@/lib/utils";

export interface BreakdownData {
  subtotal: number; promoDiscount: number; promoTitles?: string[]; bundleDiscount: number;
  couponCode?: string | null; couponDiscount: number; shippingCost?: number | null; shippingDiscount: number; total: number;
}
/** Shared price breakdown (cart, checkout, order). Shows only rows that exist; discounts are never negative numbers in the data. */
export function PriceBreakdown({ d, shippingLabel }: { d: BreakdownData; shippingLabel?: string }) {
  const row = (label: React.ReactNode, value: React.ReactNode, tone = "") => <div className="flex justify-between gap-3"><dt className="text-ink-soft">{label}</dt><dd className={tone}>{value}</dd></div>;
  return (
    <dl className="space-y-1.5 text-sm">
      {row("Subtotal", formatRupiah(d.subtotal))}
      {d.promoDiscount > 0 && row(<>Promosi{d.promoTitles?.length ? <span className="block text-xs text-ink-mute">{d.promoTitles.join(", ")}</span> : null}</>, `−${formatRupiah(d.promoDiscount)}`, "text-leaf")}
      {d.bundleDiscount > 0 && row("Diskon paket", `−${formatRupiah(d.bundleDiscount)}`, "text-leaf")}
      {d.couponDiscount > 0 && row(<>Kupon{d.couponCode ? <span className="ml-1 font-mono text-xs">{d.couponCode}</span> : null}</>, `−${formatRupiah(d.couponDiscount)}`, "text-leaf")}
      {d.shippingCost != null && row("Ongkos kirim", shippingLabel ?? formatRupiah(d.shippingCost))}
      {d.shippingDiscount > 0 && row(<>Diskon ongkir{d.couponCode ? <span className="ml-1 font-mono text-xs">{d.couponCode}</span> : null}</>, `−${formatRupiah(d.shippingDiscount)}`, "text-leaf")}
      <div className="flex items-center justify-between rounded-card bg-brand-light p-3"><dt className="font-semibold">Total</dt><dd className="text-xl font-bold text-brand-dark">{formatRupiah(d.total)}</dd></div>
    </dl>
  );
}