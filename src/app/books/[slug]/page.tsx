import { Fragment } from "react";
import Link from "next/link";
import { Star, Truck } from "lucide-react";
import { Breadcrumb } from "@/components/breadcrumb";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getBookBySlug } from "@/lib/catalog";
import { similarBooks } from "@/lib/recommendations";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getSavedIds } from "@/lib/saved";
import { stockOf } from "@/lib/cart";
import { AddToCart } from "@/components/add-to-cart";
import { WishlistButton } from "@/components/wishlist-button";
import { BookCard } from "@/components/book-card";
import { ReviewForm } from "@/components/review-form";
import { formatRupiah, jsonLd, SITE_URL } from "@/lib/utils";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const b = await getBookBySlug((await params).slug);
  if (!b) return {};
  const desc = b.description.slice(0, 155);
  return { title: b.title, description: desc, alternates: { canonical: `/books/${b.slug}` },
    openGraph: { title: b.title, description: desc, type: "book", images: b.cover_url ? [b.cover_url] : [] }, twitter: { card: "summary_large_image", title: b.title, description: desc } };
}

export default async function BookPage({ params }: P) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();
  const supabase = await createSupabaseServer();
  const user = await getUser();
  const [{ data: reviews }, related, saved, purchased] = await Promise.all([
    supabase.from("reviews").select("id, rating, body, created_at, profiles(full_name), review_images(path)").eq("book_id", book.id).eq("status", "APPROVED").order("created_at", { ascending: false }).limit(10),
    similarBooks(book.id, 4), getSavedIds(),
    user ? supabase.rpc("has_purchased", { p_book: book.id }) : Promise.resolve({ data: false }),
  ]);
  if (user) await supabase.from("user_events").insert({ user_id: user.id, type: "view_book", book_id: book.id });

  const inv = stockOf(book);
  const avail = book.format === "PRINT" ? Math.max((inv?.stock ?? 0) - (inv?.reserved ?? 0), 0) : null;
  const price = book.sale_price ?? book.price;
  const specs: [string, string | number | null][] = [["ISBN", book.isbn], ["Penulis", book.author?.name ?? null], ["Penerbit", book.publisher?.name ?? null], ["Tahun terbit", book.publication_year], ["Halaman", book.pages], ["Bahasa", book.language], ["Berat", book.format === "PRINT" ? `${book.weight_gram} g` : null], ["Dimensi", book.dimensions], ["Format", book.format === "PRINT" ? "Buku cetak" : book.format === "EBOOK" ? "E-book (PDF)" : "Modul digital (PDF)"]];

  const ld = {
    "@context": "https://schema.org", "@type": ["Product", "Book"], name: book.title, isbn: book.isbn ?? undefined, description: book.description,
    image: book.cover_url ?? undefined, author: book.author ? { "@type": "Person", name: book.author.name } : undefined,
    publisher: book.publisher ? { "@type": "Organization", name: book.publisher.name } : undefined, url: `${SITE_URL}/books/${book.slug}`,
    offers: { "@type": "Offer", priceCurrency: "IDR", price, availability: avail === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock" },
    ...(book.rating_count > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: Number(book.rating_avg), reviewCount: book.rating_count } } : {}),
  };
  const crumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Katalog", item: `${SITE_URL}/books` }, { "@type": "ListItem", position: 2, name: book.title, item: `${SITE_URL}/books/${book.slug}` }] };

  const { data: subj } = await supabase.from("book_subjects").select("subject:subjects(name,slug)").eq("book_id", book.id);
  const subjects = (subj ?? []).map((r) => r.subject as unknown as { name: string; slug: string }).filter(Boolean);
  const disc = book.sale_price != null && book.sale_price < book.price ? Math.round((1 - book.sale_price / book.price) * 100) : 0;
  const tab = "whitespace-nowrap border-b-2 border-transparent px-1 pb-3 text-sm font-medium text-ink-soft hover:text-brand";

  return (
    <article>
      <Breadcrumb crumbs={[{ href: "/", label: "Beranda" }, { href: "/books", label: "Katalog" }, ...(subjects[0] ? [{ href: `/subjects/${subjects[0].slug}`, label: subjects[0].name }] : []), { label: book.title }]} />
      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="card p-5 lg:self-start">
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-line bg-surface-muted">
            {book.cover_url ? <Image src={book.cover_url} alt={`Sampul ${book.title}`} fill priority sizes="360px" className="object-cover" /> : <div className="grid h-full place-items-center p-6 text-center font-serif text-xl text-brand">{book.title}</div>}
            {book.featured && <span className="badge absolute left-3 top-3 bg-brand text-white">Pilihan</span>}
          </div>
          {book.gallery.length > 0 && <ul className="mt-3 grid grid-cols-4 gap-2">{book.gallery.map((g, i) => <li key={g} className="relative aspect-square overflow-hidden rounded-lg border border-line bg-surface-muted"><Image src={g} alt={`${book.title} gambar ${i + 1}`} fill sizes="80px" className="object-cover" loading="lazy" /></li>)}</ul>}
        </div>

        <div className="space-y-4">
          <div className="card p-6">
            <div className="flex flex-wrap gap-2">
              {[book.level?.name, book.grade?.name].filter(Boolean).length > 0 && <span className="badge bg-brand-light text-brand">{[book.level?.name, book.grade?.name].filter(Boolean).join(" · ")}</span>}
              {subjects.map((s) => <Link key={s.slug} href={`/subjects/${s.slug}`} className="badge bg-surface-muted text-ink-soft hover:text-brand">{s.name}</Link>)}
              <span className="badge bg-leaf-light text-leaf">{book.format === "PRINT" ? "Buku cetak" : book.format === "EBOOK" ? "E-book (PDF)" : "Modul digital"}</span>
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl">{book.title}</h1>
            <p className="mt-3 text-sm text-ink-soft">Penulis: <strong className="text-ink">{book.author?.name ?? "—"}</strong> &nbsp;·&nbsp; Penerbit: <strong className="text-ink">{book.publisher?.name ?? "—"}</strong></p>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-sm"><span className="flex items-center gap-1"><Star aria-hidden className="h-4 w-4 fill-marigold text-marigold" /><strong>{book.rating_count ? Number(book.rating_avg).toFixed(1) : "—"}</strong> <span className="text-ink-mute">({book.rating_count} ulasan)</span></span><span className="text-ink-mute">·</span><span>{book.sold_count} terjual</span></p>
            <div className="mt-5 border-t border-line pt-5">
              <div className="flex flex-wrap items-baseline gap-3"><span className="text-3xl font-bold text-brand">{formatRupiah(price)}</span>{disc > 0 && <><span className="text-ink-mute line-through">{formatRupiah(book.price)}</span><span className="badge bg-marigold-light text-marigold-dark">-{disc}%</span></>}</div>
              <p className="mt-2 flex items-center gap-2 text-sm"><span className={`h-2 w-2 rounded-full ${avail === 0 ? "bg-danger" : "bg-leaf"}`} />{avail === null ? <span className="text-leaf">Produk digital — tersedia di perpustakaan setelah pembayaran diverifikasi.</span> : avail === 0 ? <span className="text-danger">Stok habis</span> : <span className="text-leaf">Stok tersedia: {avail} eksemplar</span>}</p>
            </div>
            <div className="mt-5 flex items-start gap-3"><div className="flex-1"><AddToCart bookId={book.id} max={avail} disabled={avail === 0} /></div><WishlistButton bookId={book.id} initial={saved.has(book.id)} variant="button" /></div>
            <p className="panel mt-5 flex items-start gap-2 p-3 text-xs text-ink-soft"><Truck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{book.format === "PRINT" ? "Ongkos kirim dan estimasi dihitung otomatis saat checkout, sesuai alamat dan berat pesanan." : "Produk digital tidak memerlukan pengiriman."}</p>
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <nav aria-label="Bagian halaman" className="-mt-1 mb-5 flex gap-6 overflow-x-auto border-b border-line">
          <a href="#deskripsi" className={tab}>Deskripsi</a><a href="#cocok" className={tab}>Cocok Untuk</a><a href="#spesifikasi" className={tab}>Spesifikasi</a><a href="#ulasan" className={tab}>Ulasan Pembaca ({book.rating_count})</a>
        </nav>
        <section id="deskripsi"><h2 className="text-xl">Deskripsi</h2><p className="mt-3 max-w-[680px] whitespace-pre-line font-serif text-lg leading-[30px] text-ink-soft">{book.description}</p></section>
        {(book.audience || book.topics.length > 0) && (
          <section id="cocok" className="mt-8"><h2 className="text-xl">Cocok untuk</h2>{book.audience && <p className="mt-2 text-ink-soft">{book.audience}</p>}
            {book.topics.length > 0 && <ul className="mt-3 grid gap-3 sm:grid-cols-3">{book.topics.map((t, i) => <li key={t} className="rounded-card bg-paper p-4"><p className="text-xs font-semibold text-ink-mute">Topik {i + 1}</p><p className="mt-1 font-serif text-lg font-semibold text-brand-dark">{t}</p></li>)}</ul>}</section>)}
        <section id="spesifikasi" className="mt-8"><h2 className="text-xl">Spesifikasi</h2>
          <dl className="mt-3 grid max-w-2xl grid-cols-[150px_1fr] gap-y-2 text-sm">{specs.filter(([, v]) => v != null && v !== "").map(([k, v]) => <Fragment key={k}><dt className="text-ink-mute">{k}</dt><dd className="font-medium">{v}</dd></Fragment>)}</dl></section>
        <section id="ulasan" className="mt-8"><h2 className="text-xl">Ulasan pembaca</h2>
          {purchased.data && <div className="mt-3"><ReviewForm bookId={book.id} /></div>}
          <ul className="mt-4 space-y-3">{(reviews ?? []).map((r) => (
            <li key={r.id} className="rounded-card border border-line p-4"><p className="text-sm font-semibold">{(r.profiles as unknown as { full_name: string } | null)?.full_name ?? "Pembaca"} <span className="badge ml-1 bg-leaf-light text-leaf">Pembelian terverifikasi</span></p><p className="text-marigold" aria-label={`${r.rating} dari 5`}>{"★".repeat(r.rating)}<span className="text-line">{"★".repeat(5 - r.rating)}</span></p><p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{r.body}</p>{(r.review_images as unknown as { path: string }[] | null)?.length ? <div className="mt-2 flex gap-2">{(r.review_images as unknown as { path: string }[]).map((im) => <Image key={im.path} src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/review-images/${im.path}`} alt="Foto dari pembeli" width={96} height={96} className="h-24 w-24 rounded-lg border border-line object-cover" loading="lazy" />)}</div> : null}</li>))}
            {!reviews?.length && <li className="text-sm text-ink-mute">Belum ada ulasan yang ditampilkan.</li>}</ul></section>
      </div>

      {related.length > 0 && <section className="mt-10"><h2 className="text-2xl">Buku Terkait</h2><p className="mt-1 text-sm text-ink-soft">Pilihan lain yang cocok dengan buku ini.</p><div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">{related.map((r) => <BookCard key={r.book.id} book={r.book} saved={saved.has(r.book.id)} note={r.reasons[0]} />)}</div></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
    </article>
  );
}