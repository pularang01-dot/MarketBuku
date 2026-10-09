import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailWarning } from "lucide-react";

export const metadata: Metadata = { title: "Konfirmasi Email", robots: { index: false } };

export default async function Selesai({ searchParams }: { searchParams: Promise<{ tipe?: string }> }) {
  const { tipe } = await searchParams;
  const ok = tipe === "daftar";
  return (
    <div className="card mx-auto mt-6 grid max-w-md place-items-center gap-4 p-8 text-center">
      <span className={`grid h-16 w-16 place-items-center rounded-pill ${ok ? "bg-leaf-light text-leaf" : "bg-marigold-light text-marigold-dark"}`}>{ok ? <CheckCircle2 aria-hidden className="h-8 w-8" /> : <MailWarning aria-hidden className="h-8 w-8" />}</span>
      {ok ? (
        <>
          <h1 className="text-2xl">Email berhasil dikonfirmasi</h1>
          <p className="text-sm text-ink-soft">Akunmu sudah aktif dan kamu sudah masuk. Atur preferensi belajar agar rekomendasi buku lebih tepat, atau langsung mulai belanja.</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row"><Link href="/account/preferences" className="btn-primary flex-1">Atur Preferensi Belajar</Link><Link href="/books" className="btn-ghost flex-1">Mulai Belanja</Link></div>
        </>
      ) : (
        <>
          <h1 className="text-2xl">Tautan tidak valid atau sudah kedaluwarsa</h1>
          <p className="text-sm text-ink-soft">Tautan konfirmasi atau reset kata sandi hanya berlaku sekali dan untuk waktu terbatas. Minta tautan baru di bawah ini.</p>
          <div className="flex w-full flex-col gap-2 sm:flex-row"><Link href="/auth/kirim-ulang" className="btn-primary flex-1">Kirim Ulang Konfirmasi</Link><Link href="/forgot-password" className="btn-ghost flex-1">Reset Kata Sandi</Link></div>
        </>
      )}
    </div>
  );
}