import { requireUser } from "@/lib/auth/session";
import { SideNav } from "@/components/side-nav";
export const metadata = { robots: { index: false } };
const LINKS: [string, string][] = [["/account", "Ringkasan"], ["/account/profile", "Profil"], ["/account/addresses", "Alamat"], ["/orders", "Pesanan"], ["/account/wishlist", "Wishlist"], ["/account/reviews", "Ulasan"], ["/account/notifications", "Notifikasi"], ["/account/preferences", "Preferensi"]];
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/account");
  return (<div className="grid gap-6 md:grid-cols-[220px_1fr]"><div><SideNav links={LINKS} label="Akun" exact={["/account"]} /></div><div className="min-w-0">{children}</div></div>);
}