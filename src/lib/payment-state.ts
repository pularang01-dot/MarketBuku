/** Pure helpers: payment phase (kept separate from the order status) and the buyer-facing timeline. */
export type ProofStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface ProofLike { status: ProofStatus; created_at: string; reject_reason?: string | null }

export type PaymentPhase = "AWAITING_PAYMENT" | "AWAITING_VERIFICATION" | "PROOF_REJECTED" | "PAID" | "REFUNDED" | "CANCELLED";

export const PHASE_LABEL: Record<PaymentPhase, string> = {
  AWAITING_PAYMENT: "Menunggu pembayaran",
  AWAITING_VERIFICATION: "Menunggu verifikasi",
  PROOF_REJECTED: "Bukti ditolak",
  PAID: "Lunas",
  REFUNDED: "Dana dikembalikan",
  CANCELLED: "Dibatalkan",
};
export const PHASE_TONE: Record<PaymentPhase, string> = {
  AWAITING_PAYMENT: "bg-marigold-light text-marigold-dark",
  AWAITING_VERIFICATION: "bg-brand-light text-brand",
  PROOF_REJECTED: "bg-danger-light text-danger",
  PAID: "bg-leaf-light text-leaf",
  REFUNDED: "bg-danger-light text-danger",
  CANCELLED: "bg-surface-muted text-ink-soft",
};

const newest = (proofs: ProofLike[]) => [...proofs].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];

export function paymentPhase(orderStatus: string, proofs: ProofLike[] = []): PaymentPhase {
  if (orderStatus === "CANCELLED") return "CANCELLED";
  if (orderStatus === "REFUNDED") return "REFUNDED";
  if (orderStatus !== "PENDING_PAYMENT") return "PAID"; // PAID and everything after it
  if (proofs.some((p) => p.status === "PENDING")) return "AWAITING_VERIFICATION";
  if (newest(proofs)?.status === "REJECTED") return "PROOF_REJECTED";
  return "AWAITING_PAYMENT";
}

/** A new proof may be uploaded only while the order still awaits payment and none is already pending. */
export const canUploadProof = (orderStatus: string, proofs: ProofLike[] = []) =>
  orderStatus === "PENDING_PAYMENT" && !proofs.some((p) => p.status === "PENDING");

export interface TimelineStep { key: string; label: string; state: "done" | "current" | "upcoming"; at?: string | null }

const RANK: Record<string, number> = { PAID: 1, PROCESSING: 2, PACKED: 2, SHIPPED: 3, DELIVERED: 3, COMPLETED: 4 };

/** Shows only what has really happened; never marks a future step as done. */
export function timeline(order: { status: string; created_at: string; has_physical?: boolean }, proofs: ProofLike[] = []): TimelineStep[] {
  const created: TimelineStep = { key: "created", label: "Pesanan dibuat", state: "done", at: order.created_at };
  if (order.status === "CANCELLED") return [created, { key: "cancelled", label: "Pesanan dibatalkan", state: "current" }];
  if (order.status === "REFUNDED") return [created, { key: "refunded", label: "Dana dikembalikan", state: "current" }];

  const rank = RANK[order.status] ?? 0;
  const paid = rank >= 1;
  const hasProof = proofs.length > 0;
  const firstProof = [...proofs].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
  const physical = order.has_physical !== false;

  const defs: { key: string; label: string; done: boolean; at?: string | null }[] = [
    { key: "created", label: "Pesanan dibuat", done: true, at: order.created_at },
    { key: "awaiting", label: "Menunggu pembayaran", done: hasProof || paid },
    { key: "proof", label: "Bukti pembayaran diterima", done: hasProof || paid, at: firstProof?.created_at },
    { key: "verified", label: "Pembayaran diverifikasi", done: paid },
    { key: "processing", label: "Pesanan diproses", done: rank >= 2 },
    ...(physical ? [{ key: "shipped", label: "Dikirim", done: rank >= 3 }] : []),
    { key: "completed", label: "Selesai", done: rank >= 4 },
  ];
  let currentAssigned = false;
  return defs.map((d) => {
    if (d.done) return { key: d.key, label: d.label, state: "done" as const, at: d.at };
    if (!currentAssigned) { currentAssigned = true; return { key: d.key, label: d.label, state: "current" as const }; }
    return { key: d.key, label: d.label, state: "upcoming" as const };
  });
}