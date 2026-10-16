/** Campaign/coupon lifecycle label for admin screens. Start inclusive, end exclusive; server clock. */
export type CampaignStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE";

export function campaignStatus(c: { active: boolean; startsAt: string | null; endsAt: string | null }, now: Date): CampaignStatus {
  if (!c.active) return "INACTIVE";
  const t = now.getTime();
  if (c.startsAt && t < new Date(c.startsAt).getTime()) return "SCHEDULED";
  if (c.endsAt && t >= new Date(c.endsAt).getTime()) return "EXPIRED";
  return "ACTIVE";
}
export const STATUS_LABEL: Record<CampaignStatus, string> = { ACTIVE: "Aktif", SCHEDULED: "Terjadwal", EXPIRED: "Berakhir", INACTIVE: "Nonaktif" };
export const STATUS_TONE: Record<CampaignStatus, string> = { ACTIVE: "bg-leaf-light text-leaf", SCHEDULED: "bg-brand-light text-brand", EXPIRED: "bg-surface-muted text-ink-soft", INACTIVE: "bg-danger-light text-danger" };