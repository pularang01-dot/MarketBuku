/** Campaign dates are entered and shown in WIB (Asia/Jakarta, UTC+7) and stored as UTC timestamps. */
const RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const fromWibInput = (v?: string | null): string | null => {
  if (!v || !RE.test(v)) return null;
  const d = new Date(`${v}:00+07:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
export const toWibInput = (iso?: string | null): string => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + 7 * 3_600_000);
  return d.toISOString().slice(0, 16);
};
export const formatWib = (iso?: string | null) => iso ? new Date(iso).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }) + " WIB" : "—";