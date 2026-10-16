/** Display price of a book: automatic promotion first, else sale price, else list price. Client-safe. */
export interface PriceInfo { price: number; sale_price: number | null; promo?: { netUnit: number; title: string; percent: number } | null }
export const displayPrice = (b: PriceInfo) => b.promo?.netUnit ?? (b.sale_price != null && b.sale_price <= b.price ? b.sale_price : b.price);
export const discountPercent = (b: PriceInfo) => { const eff = displayPrice(b); return eff < b.price && b.price > 0 ? Math.round((1 - eff / b.price) * 100) : 0; };