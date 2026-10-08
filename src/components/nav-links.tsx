"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const NAV = [
  { href: "/books", label: "Katalog", match: (p: string, s: string) => p.startsWith("/books") && !s },
  { href: "/books?sort=popular", label: "Terlaris", match: (_: string, s: string) => s.includes("sort=popular") },
  { href: "/books?sort=newest", label: "Terbaru", match: (_: string, s: string) => s.includes("sort=newest") },
  { href: "/promo", label: "Promo", match: (p: string) => p.startsWith("/promo") },
  { href: "/bundles", label: "Paket Edukasi", match: (p: string) => p.startsWith("/bundles") },
  { href: "/book-finder", label: "Cari Buku", match: (p: string) => p.startsWith("/book-finder") },
  { href: "/articles", label: "Artikel", match: (p: string) => p.startsWith("/articles") },
];

function Inner() {
  const path = usePathname();
  const sp = useSearchParams().toString();
  return (
    <ul className="mx-auto flex max-w-page gap-1 overflow-x-auto px-4 text-sm sm:px-6">
      {NAV.map((n) => {
        const active = n.match(path, sp);
        return (
          <li key={n.href}>
            <Link href={n.href} aria-current={active ? "page" : undefined}
              className={`relative inline-block whitespace-nowrap px-3 py-3 transition ${active ? "font-semibold text-brand-dark after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand" : "text-ink-soft hover:text-brand"}`}>
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
export function NavLinks() { return <Suspense fallback={<div className="h-11" />}><Inner /></Suspense>; }