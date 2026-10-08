import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import type { BookRow } from "@/types";
import { formatRupiah } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";
import { QuickAdd } from "./quick-add";

export function stockInfo(b: BookRow) {
  if (b.format !== "PRINT") return { label: "Digital", tone: "bg-leaf-light text-leaf", out: false };
  const inv = Array.isArray(b.inventory) ? b.inventory[0] : b.inventory;
  const av = Math.max((inv?.stock ?? 0) - (inv?.reserved ?? 0), 0);
  if (av === 0) return { label: "Habis", tone: "bg-danger-light text-danger", out: true };
  if (av <= 5) return { label: `Sisa ${av}`, tone: "bg-marigold-light text-marigold-dark", out: false };
  return { label: "Tersedia", tone: "bg-leaf-light text-leaf", out: false };
}

export function BookCard({ book, saved = false, note }: { book: BookRow; saved?: boolean; note?: string }) {
  const s = stockInfo(book);
  const disc = book.sale_price != null && book.sale_price < book.price ? Math.round((1 - book.sale_price / book.price) * 100) : 0;
  const chip = [book.grade?.name, book.level?.name].filter(Boolean)[0];
  return (
    <article className="card group relative flex flex-col p-3 transition hover:shadow-float">
      <Link href={`/books/${book.slug}`} className="block" tabIndex={-1} aria-hidden>
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-line bg-surface-muted">
          {book.cover_url ? <Image src={book.cover_url} alt="" fill sizes="(max-width:640px) 50vw, 260px" className="object-cover" />
            : <div className="grid h-full place-items-center p-4 text-center font-serif text-sm text-brand">{book.title}</div>}
          {disc > 0 && <span className="badge absolute left-2 top-2 bg-marigold-light text-marigold-dark">-{disc}%</span>}
        </div>
      </Link>
      <div className="absolute right-5 top-5"><WishlistButton bookId={book.id} initial={saved} /></div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {chip && <span className="badge bg-brand-light text-brand">{chip}</span>}
        <span className={`badge ${s.tone}`}>{s.label}</span>
      </div>
      <Link href={`/books/${book.slug}`} className="mt-2 line-clamp-2 font-serif text-[17px] font-semibold leading-snug text-brand-dark hover:text-brand">{book.title}</Link>
      <p className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{book.author?.name ?? "—"}</p>
      <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft"><Star aria-hidden className="h-3.5 w-3.5 fill-marigold text-marigold" />{book.rating_count ? <>{Number(book.rating_avg).toFixed(1)} <span className="text-ink-mute">({book.rating_count} ulasan)</span></> : <span className="text-ink-mute">Belum ada ulasan</span>}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <div className="leading-tight">
          {disc > 0 && <p className="text-xs text-ink-mute line-through">{formatRupiah(book.price)}</p>}
          <p className="text-base font-bold text-brand">{formatRupiah(disc > 0 ? book.sale_price! : book.price)}</p>
        </div>
        <QuickAdd bookId={book.id} disabled={s.out} />
      </div>
      {note && <p className="mt-2 border-t border-line pt-2 text-xs italic text-ink-soft">{note}</p>}
    </article>
  );
}

export function BookGrid({ books, saved, empty = "Belum ada buku yang cocok." }: { books: BookRow[]; saved?: Set<string>; empty?: string }) {
  if (!books.length) return <p className="card p-8 text-center text-ink-soft">{empty}</p>;
  return <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">{books.map((b) => <BookCard key={b.id} book={b} saved={saved?.has(b.id)} />)}</div>;
}