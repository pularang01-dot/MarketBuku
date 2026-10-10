import Link from "next/link";
import { BookOpen, Heart, ShoppingBag, User } from "lucide-react";
import { getProfile } from "@/lib/auth/session";
import { getCart } from "@/lib/cart";
import { getSavedIds } from "@/lib/saved";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SearchBox } from "./search-box";
import { NavLinks } from "./nav-links";
import { logout } from "@/actions/auth";

export async function Header() {
  const [profile, cart, saved] = await Promise.all([getProfile(), getCart(), getSavedIds()]);
  const supabase = await createSupabaseServer();
  const { data: ann } = await supabase.from("site_settings").select("value").eq("key", "announcement").maybeSingle();
  const announcement = typeof ann?.value === "string" && ann.value ? ann.value : "Buku pelajaran, latihan soal, dan referensi untuk SD, SMP, dan SMA";
  const count = cart.lines.reduce((s, l) => s + l.quantity, 0);
  const iconBtn = "relative flex h-11 items-center gap-1.5 rounded-ctl border border-line bg-white px-3 text-sm text-ink-soft hover:border-brand hover:text-brand";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white print:hidden">
      <div className="bg-brand-light text-xs text-ink-soft">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-1.5 sm:px-6">
          <p role="note" className="truncate">{announcement}</p>
          <p className="hidden shrink-0 gap-4 sm:flex"><Link href="/orders" className="hover:text-brand">Lacak Pesanan</Link><Link href="/promo" className="ml-4 hover:text-brand">Promo</Link></p>
        </div>
      </div>
      <div className="mx-auto flex max-w-page items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Toko Buku Edukasi, beranda">
          <span className="grid h-9 w-9 place-items-center rounded-ctl bg-brand text-white"><BookOpen aria-hidden className="h-5 w-5" /></span>
          <span className="hidden font-serif text-xl font-semibold text-brand-dark sm:inline">Toko Buku Edukasi</span>
        </Link>
        <div className="hidden flex-1 md:block md:max-w-xl md:px-4"><SearchBox /></div>
        <nav aria-label="Akun" className="ml-auto flex items-center gap-2">
          <Link href="/wishlist" aria-label={`Wishlist, ${saved.size} buku`} className={iconBtn}><Heart className="h-5 w-5" /><span className="text-xs font-semibold">{saved.size}</span></Link>
          <Link href="/cart" aria-label={`Keranjang, ${count} item`} className={iconBtn}><ShoppingBag className="h-5 w-5" /><span className="grid h-5 min-w-5 place-items-center rounded-pill bg-brand px-1 text-[11px] font-bold text-white">{count}</span></Link>
          {profile ? (
            <details className="relative">
              <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-pill bg-brand text-sm font-bold text-white" aria-label="Menu akun">{(profile.full_name ?? "U").slice(0, 1).toUpperCase()}</summary>
              <div className="card absolute right-0 mt-2 w-56 p-2 text-sm shadow-float">
                <p className="truncate px-3 py-2 font-semibold">{profile.full_name}</p>
                {[["/account", "Akun saya"], ["/orders", "Pesanan"], ["/library", "Perpustakaan digital"]].map(([h, l]) => <Link key={h} href={h} className="block rounded-lg px-3 py-2 hover:bg-brand-light">{l}</Link>)}
                {["ADMIN", "SUPER_ADMIN"].includes(profile.role) && <Link href="/admin/dashboard" className="block rounded-lg px-3 py-2 hover:bg-brand-light">Admin</Link>}
                <form action={logout}><button className="w-full rounded-lg px-3 py-2 text-left text-danger hover:bg-danger-light">Keluar</button></form>
              </div>
            </details>
          ) : (<><Link href="/login" className="btn-ghost !min-h-[44px]">Masuk</Link><Link href="/register" aria-label="Daftar" className="hidden h-11 w-11 place-items-center rounded-pill bg-brand text-white sm:grid"><User className="h-5 w-5" /></Link></>)}
        </nav>
      </div>
      <div className="px-4 pb-3 md:hidden"><SearchBox /></div>
      <nav aria-label="Navigasi utama" className="border-t border-line"><NavLinks /></nav>
    </header>
  );
}