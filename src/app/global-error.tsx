"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (<html lang="id"><body style={{ fontFamily: "system-ui", padding: 40, textAlign: "center" }}><h1>Terjadi kendala</h1><p>Silakan muat ulang halaman.</p><button onClick={reset}>Coba lagi</button></body></html>);
}
