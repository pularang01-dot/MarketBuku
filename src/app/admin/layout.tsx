import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin-nav";
import { logout } from "@/actions/auth";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
const GROUPS = [
  { title: "Ringkasan", items: [{ href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard" }, { href: "/admin/analytics", label: "Analitik", icon: "Activity" }] },
  { title: "Katalog", items: [{ href: "/admin/books", label: "Buku", icon: "Library" }, { href: "/admin/inventory", label: "Inventori", icon: "Boxes" }, { href: "/admin/categories", label: "Kategori", icon: "Tags" }, { href: "/admin/subjects", label: "Mapel", icon: "Tags" }, { href: "/admin/grades", label: "Kelas", icon: "GraduationCap" }, { href: "/admin/authors", label: "Penulis", icon: "UserRound" }, { href: "/admin/publishers", label: "Penerbit", icon: "Building2" }] },
  { title: "Penjualan", items: [{ href: "/admin/orders", label: "Pesanan", icon: "PackageCheck" }, { href: "/admin/payments", label: "Verifikasi Pembayaran", icon: "ReceiptText" }, { href: "/admin/bank-accounts", label: "Rekening Toko", icon: "Landmark" }, { href: "/admin/customers", label: "Pelanggan", icon: "UserRound" }] },
  { title: "Konten & Promosi", items: [{ href: "/admin/reviews", label: "Ulasan", icon: "MessageSquareText" }, { href: "/admin/coupons", label: "Kupon", icon: "TicketPercent" }, { href: "/admin/promotions", label: "Promo", icon: "Megaphone" }, { href: "/admin/bundles", label: "Paket", icon: "Gift" }, { href: "/admin/articles", label: "Artikel", icon: "Newspaper" }, { href: "/admin/settings", label: "Pengaturan", icon: "Settings" }] },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin(); // server-side role gate for every /admin/* route
  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <aside className="md:sticky md:top-40 md:self-start">
        <div className="card p-3">
          <div className="mb-3 border-b border-line px-3 pb-3"><p className="font-serif text-lg font-semibold text-brand-dark">Panel Admin</p><p className="text-xs text-ink-mute">Portal Pengelola Toko</p></div>
          <div className="max-h-[60vh] overflow-y-auto pr-1"><AdminNav groups={GROUPS as unknown as Parameters<typeof AdminNav>[0]["groups"]} /></div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-3 pt-3"><div className="flex min-w-0 items-center gap-2"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-brand text-xs font-bold text-white">{(me.full_name ?? "A").slice(0, 1).toUpperCase()}</span><span className="truncate text-sm font-medium">{me.full_name}</span></div>
            <form action={logout}><button aria-label="Keluar" className="grid h-9 w-9 place-items-center rounded-ctl text-ink-mute hover:bg-danger-light hover:text-danger"><LogOut className="h-4 w-4" /></button></form></div>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}