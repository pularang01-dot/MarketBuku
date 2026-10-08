export type OrderStatus =
  | "PENDING_PAYMENT" | "PAID" | "PROCESSING" | "PACKED" | "SHIPPED"
  | "DELIVERED" | "COMPLETED" | "CANCELLED" | "REFUNDED";

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAID", "CANCELLED"],
  PAID: ["PROCESSING", "COMPLETED", "REFUNDED", "CANCELLED"],
  PROCESSING: ["PACKED", "REFUNDED", "CANCELLED"],
  PACKED: ["SHIPPED", "REFUNDED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from]?.includes(to) ?? false;

/** Statuses an admin may set manually. PAID is only reachable via a verified webhook. */
export const ADMIN_SETTABLE: OrderStatus[] = ["PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran", PAID: "Dibayar", PROCESSING: "Diproses", PACKED: "Dikemas",
  SHIPPED: "Dikirim", DELIVERED: "Tiba di tujuan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan", REFUNDED: "Dana dikembalikan",
};
