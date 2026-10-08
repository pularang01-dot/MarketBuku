import Link from "next/link";
export default function NotFound() { return (<div className="card mx-auto max-w-md p-8 text-center"><h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1><p className="mt-2 text-ink-soft">Tautan mungkin sudah berubah atau buku sudah tidak dijual.</p><Link href="/books" className="btn-primary mt-4">Lihat Katalog</Link></div>); }
