"use client";
import Image from "next/image";
import { useActionState } from "react";
import { addGalleryImages, removeGalleryImage, archiveBook } from "@/actions/admin-content";
import { ConfirmButton } from "./row-actions";
import { Msg, Submit } from "./form-bits";

export function GalleryManager({ bookId, gallery }: { bookId: string; gallery: string[] }) {
  const [s, a] = useActionState(addGalleryImages, null);
  return (
    <section className="card mt-6 space-y-3 p-4"><h2 className="text-xl font-bold">Galeri ({gallery.length}/8)</h2>
      <ul className="grid grid-cols-4 gap-2">{gallery.map((g) => <li key={g} className="relative"><div className="relative aspect-square overflow-hidden rounded bg-brand-light"><Image src={g} alt="Gambar galeri" fill sizes="120px" className="object-cover" /></div><ConfirmButton label="Hapus" confirmText="Hapus gambar?" action={() => removeGalleryImage(bookId, g)} className="mt-1 text-xs text-danger underline" /></li>)}</ul>
      <form action={a} className="space-y-2"><input type="hidden" name="book_id" value={bookId} /><label htmlFor="images" className="label">Tambah gambar (JPG/PNG/WebP, maks 5 MB)</label><input id="images" name="images" type="file" multiple accept="image/jpeg,image/png,image/webp" /><Msg state={s} /><Submit className="btn-ghost">Unggah</Submit></form>
      <div className="border-t pt-3"><ConfirmButton label="Arsipkan buku ini" confirmText="Arsipkan buku? Buku tidak akan tampil di toko, riwayat pesanan tetap aman." action={() => archiveBook(bookId)} /></div>
    </section>
  );
}