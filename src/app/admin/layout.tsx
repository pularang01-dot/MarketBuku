import { requireAdmin } from "@/lib/auth/session";
import { SideNav } from "@/components/side-nav";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };
const LINKS: [string, string][] = [
  ["/admin/dashboard", "Dashboard"], ["/admin/books", "Buku"], ["/admin/categories", "Kategori"], ["/admin/subjects", "Mapel"], ["/admin/grades", "Kelas"], ["/admin/authors", "Penulis"], ["/admin/publishers", "Penerbit"],
  ["/admin/inventory", "Inventori"], ["/admin/orders", "Pesanan"], ["/admin/payments", "Pembayaran"], ["/admin/bank-accounts", "Rekening"], ["/admin/customers", "Pelanggan"], ["/admin/reviews", "Ulasan"],
  ["/admin/coupons", "Kupon"], ["/admin/promotions", "Promo"], ["/admin/bundles", "Paket"], ["/admin/articles", "Artikel"], ["/admin/analytics", "Analitik"], ["/admin/settings", "Pengaturan"],
];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // server-side role gate for every /admin/* route
  return (
    <div className="grid gap-6 md:grid-cols-[210px_1fr]">
      <div className="md:sticky md:top-40 md:self-start"><p className="mb-2 hidden px-2 text-xs font-bold uppercase tracking-wide text-ink-mute md:block">Panel Admin</p><SideNav links={LINKS} label="Admin" /></div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}