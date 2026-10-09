import { TabNav } from "./tab-nav";
const TABS = [{ href: "/admin/reviews", label: "Moderasi Ulasan" }, { href: "/admin/coupons", label: "Kupon & Diskon" }, { href: "/admin/promotions", label: "Promo" }, { href: "/admin/bundles", label: "Paket" }, { href: "/admin/articles", label: "Artikel" }, { href: "/admin/settings", label: "Pengaturan Toko" }];
export function ContentTabs({ active, counts = {} }: { active: string; counts?: Record<string, number> }) {
  return <TabNav label="Konten & promosi" active={active} tabs={TABS.map((t) => ({ ...t, count: counts[t.href] }))} />;
}