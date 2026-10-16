const rp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
export const SCOPE_LABEL: Record<string, string> = { ALL: "Semua buku", CATEGORY: "Kategori", SUBJECT: "Mata pelajaran", LEVEL: "Jenjang", GRADE: "Kelas", BOOK: "Buku tertentu" };
export const scopeText = (type: string, count: number) => (type === "ALL" ? SCOPE_LABEL.ALL : `${SCOPE_LABEL[type] ?? type} (${count})`);

export function describeBenefit(type: string | null, value: number, maxDiscount: number | null) {
  if (!type) return "Banner (tanpa diskon otomatis)";
  if (type === "PERCENT") return `Diskon ${value}%${maxDiscount ? `, maks. ${rp(maxDiscount)}` : ""}`;
  if (type === "FIXED") return `Potongan ${rp(value)}`;
  if (type === "FREE_SHIPPING") return "Gratis ongkir";
  return type;
}