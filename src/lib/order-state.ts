export type OrderStatus =
  | "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "PACKED" | "SHIPPED"
  | "DELIVERED" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "PACKED", "SHIPPED", "COMPLETED", "REFUNDED", "CANCELLED"],
  PROCESSING: ["PACKED", "SHIPPED", "REFUNDED", "CANCELLED"],
  PACKED: ["SHIPPED", "REFUNDED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/**
 * What the admin can pick next. Packing steps may be skipped (small shops often ship straight away),
 * but a physical order can never be completed without being shipped, and a digital-only order is never "shipped".
 */
export function allowedTransitions(from: OrderStatus, hasPhysical = true): OrderStatus[] {
  const base = (ORDER_TRANSITIONS[from] ?? []).filter((s) => ADMIN_SETTABLE.includes(s));
  const preShipment = ["PAID", "PROCESSING", "PACKED"].includes(from);
  if (preShipment && hasPhysical) return base.filter((s) => s !== "COMPLETED");
  if (preShipment && !hasPhysical) return base.filter((s) => !["PROCESSING", "PACKED", "SHIPPED"].includes(s));
  return base;
}

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from]?.includes(to) ?? false;

/** Statuses an admin may set manually. PAID is only reachable via a verified webhook. */
export const ADMIN_SETTABLE: OrderStatus[] = ["PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran", PAID: "Dibayar", PROCESSING: "Diproses", PACKED: "Dikemas",
  SHIPPED: "Dikirim", DELIVERED: "Tiba di tujuan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan", REFUNDED: "Dana dikembalikan",
};