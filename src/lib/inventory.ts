/** Pure helpers mirroring inventory invariants enforced in SQL. */
export interface Stock { stock: number; reserved: number }

export const available = (s: Stock) => Math.max(s.stock - s.reserved, 0);
export const canReserve = (s: Stock, qty: number) => qty > 0 && available(s) >= qty;

export function reserve(s: Stock, qty: number): Stock {
  if (!canReserve(s, qty)) throw new Error("INSUFFICIENT_STOCK");
  return { stock: s.stock, reserved: s.reserved + qty };
}
export function commitSale(s: Stock, qty: number): Stock {
  if (s.reserved < qty) throw new Error("NOT_RESERVED");
  return { stock: s.stock - qty, reserved: s.reserved - qty };
}
export function release(s: Stock, qty: number): Stock {
  return { stock: s.stock, reserved: Math.max(s.reserved - qty, 0) };
}
export const isLow = (s: Stock, threshold: number) => available(s) > 0 && available(s) <= threshold;
