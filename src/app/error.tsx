"use client";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (<div className="card mx-auto max-w-md p-8 text-center" role="alert"><h1 className="text-2xl font-bold">Terjadi kendala</h1><p className="mt-2 text-ink-soft">Halaman ini belum bisa dimuat. Silakan coba lagi sebentar lagi.</p><button onClick={reset} className="btn-primary mt-4">Coba lagi</button></div>);
}
