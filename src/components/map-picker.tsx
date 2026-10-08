"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker } from "leaflet";

export interface ResolvedAddress { province?: string; city?: string; district?: string; postal_code?: string; address_line?: string }
interface Props { lat?: number | null; lng?: number | null; onChange: (lat: number, lng: number) => void; onResolve?: (a: ResolvedAddress) => void }

const CENTER: [number, number] = [Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LAT ?? -7.2575), Number(process.env.NEXT_PUBLIC_MAP_DEFAULT_LNG ?? 112.7521)];
const NOMINATIM = "https://nominatim.openstreetmap.org"; // public OSM geocoder: fine for low volume; use your own/paid geocoder at scale

async function reverse(lat: number, lng: number): Promise<ResolvedAddress | null> {
  try {
    const r = await fetch(`${NOMINATIM}/reverse?format=jsonv2&addressdetails=1&accept-language=id&lat=${lat}&lon=${lng}`);
    if (!r.ok) return null;
    const a = ((await r.json()) as { address?: Record<string, string> }).address ?? {};
    const pc = a.postcode && /^[0-9]{5}$/.test(a.postcode) ? a.postcode : undefined;
    return {
      province: a.state, city: a.city || a.county || a.town || a.municipality,
      district: a.city_district || a.suburb || a.village || a.subdistrict, postal_code: pc,
      address_line: [a.road, a.house_number].filter(Boolean).join(" ") || undefined,
    };
  } catch { return null; }
}

export function MapPicker({ lat, lng, onChange, onResolve }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const leaflet = useRef<typeof import("leaflet") | null>(null);
  const cbChange = useRef(onChange); const cbResolve = useRef(onResolve);
  cbChange.current = onChange; cbResolve.current = onResolve;
  const [q, setQ] = useState(""); const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [status, setStatus] = useState(""); const [ready, setReady] = useState(false);

  const commit = useCallback(async (la: number, ln: number) => {
    cbChange.current(la, ln);
    setStatus("Mencari alamat dari titik...");
    const a = await reverse(la, ln);
    setStatus(a ? "Alamat terisi dari titik peta. Periksa dan lengkapi bila perlu." : "Titik tersimpan. Isi alamat secara manual.");
    if (a) cbResolve.current?.(a);
  }, []);

  const place = useCallback((la: number, ln: number, zoom = true) => {
    const L = leaflet.current; if (!L || !map.current) return;
    if (!marker.current) {
      marker.current = L.marker([la, ln], { draggable: true, icon: L.divIcon({ className: "map-pin", html: "<span></span>", iconSize: [28, 28], iconAnchor: [14, 28] }) }).addTo(map.current);
      marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); commit(p.lat, p.lng); });
    } else marker.current.setLatLng([la, ln]);
    if (zoom) map.current.setView([la, ln], 17);
  }, [commit]);

  useEffect(() => {
    let dead = false;
    (async () => {
      const L = (await import("leaflet")).default; if (dead || !el.current) return;
      leaflet.current = L;
      const m = L.map(el.current).setView(lat != null && lng != null ? [lat, lng] : CENTER, lat != null ? 17 : 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      m.on("click", (e) => { place(e.latlng.lat, e.latlng.lng, false); commit(e.latlng.lat, e.latlng.lng); });
      map.current = m; setReady(true);
      if (lat != null && lng != null) place(lat, lng, false);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the pin in sync when a saved address is chosen from outside
  useEffect(() => {
    if (!ready || lat == null || lng == null) return;
    const cur = marker.current?.getLatLng();
    if (!cur || Math.abs(cur.lat - lat) > 1e-7 || Math.abs(cur.lng - lng) > 1e-7) place(lat, lng, true);
  }, [lat, lng, ready, place]);

  async function search() {
    if (q.trim().length < 3) return;
    setStatus("Mencari...");
    try {
      const r = await fetch(`${NOMINATIM}/search?format=jsonv2&countrycodes=id&limit=5&accept-language=id&q=${encodeURIComponent(q.trim())}`);
      const j = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      setResults(j); setStatus(j.length ? "" : "Lokasi tidak ditemukan. Coba kata kunci lain atau klik langsung di peta.");
    } catch { setStatus("Pencarian gagal. Klik langsung di peta untuk menaruh pin."); }
  }
  function locate() {
    if (!navigator.geolocation) { setStatus("Peramban tidak mendukung lokasi."); return; }
    setStatus("Mengambil lokasimu...");
    navigator.geolocation.getCurrentPosition((p) => { place(p.coords.latitude, p.coords.longitude, true); commit(p.coords.latitude, p.coords.longitude); },
      () => setStatus("Izin lokasi ditolak. Cari alamat atau klik di peta."), { enableHighAccuracy: true, timeout: 10_000 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="map-q" className="sr-only">Cari lokasi</label>
        <input id="map-q" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }} placeholder="Cari nama jalan, gedung, atau daerah" className="input min-w-0 flex-1" />
        <button type="button" className="btn-ghost" onClick={search}>Cari</button>
        <button type="button" className="btn-ghost" onClick={locate}>Lokasi saya</button>
      </div>
      {results.length > 0 && <ul className="card max-h-44 overflow-auto p-1 text-sm">{results.map((r, i) => <li key={i}><button type="button" className="w-full rounded px-3 py-2 text-left hover:bg-brand-light" onClick={() => { const la = +r.lat, ln = +r.lon; place(la, ln, true); commit(la, ln); setResults([]); }}>{r.display_name}</button></li>)}</ul>}
      <div ref={el} className="h-64 w-full overflow-hidden rounded-card border border-ink/15" role="application" aria-label="Peta untuk menentukan titik pengiriman" />
      <p role="status" className="text-xs text-ink-soft">{status || "Klik peta atau geser pin untuk menentukan titik pengiriman yang tepat."}</p>
    </div>
  );
}