export interface BundleDef { id: string; price: number; items: { bookId: string; quantity: number; unit: number }[] }

/** Mirror of the SQL in create_order(): best single bundle, applied per complete set. SQL is authoritative. */
export function bestBundleDiscount(cart: Map<string, number>, bundles: BundleDef[]) {
  let best = 0; let bestId: string | null = null;
  for (const b of bundles) {
    if (!b.items.length) continue;
    const sets = Math.min(...b.items.map((i) => Math.floor((cart.get(i.bookId) ?? 0) / i.quantity)));
    if (sets <= 0) continue;
    const normal = b.items.reduce((s, i) => s + i.unit * i.quantity, 0);
    const d = Math.max(normal - b.price, 0) * sets;
    if (d > best) { best = d; bestId = b.id; }
  }
  return { discount: best, bundleId: bestId };
}
