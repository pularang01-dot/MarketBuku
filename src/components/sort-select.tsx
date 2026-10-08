"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Inner() {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  return (
    <div className="flex items-center gap-2"><label htmlFor="sort" className="text-sm text-ink-soft">Urutkan</label>
      <select id="sort" className="input !min-h-[40px] !w-auto" defaultValue={sp.get("sort") ?? "popular"}
        onChange={(e) => { const u = new URLSearchParams(sp.toString()); u.set("sort", e.target.value); u.delete("page"); router.push(`${path}?${u}`); }}>
        <option value="popular">Terpopuler</option><option value="newest">Terbaru</option><option value="price_asc">Harga terendah</option><option value="price_desc">Harga tertinggi</option><option value="rating">Rating tertinggi</option>
      </select></div>
  );
}
export function SortSelect() { return <Suspense fallback={null}><Inner /></Suspense>; }