import { STATUS_LABEL, type OrderStatus } from "@/lib/order-state";
const TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-marigold-light text-marigold-dark", PAID: "bg-brand-light text-brand", PROCESSING: "bg-brand-light text-brand", PACKED: "bg-brand-light text-brand",
  SHIPPED: "bg-leaf-light text-leaf", DELIVERED: "bg-leaf-light text-leaf", COMPLETED: "bg-leaf text-white", CANCELLED: "bg-surface-muted text-ink-soft", REFUNDED: "bg-danger-light text-danger",
};
export function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return <span className={`badge ${TONE[s] ?? "bg-surface-muted text-ink-soft"}`}>{STATUS_LABEL[s] ?? status}</span>;
}