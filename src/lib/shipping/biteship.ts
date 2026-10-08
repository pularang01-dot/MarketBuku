import "server-only";
import type { ShippingProvider, Rate } from "./types";

/**
 * Biteship adapter (https://biteship.com). Written from public API docs; verify with your own
 * API key in Biteship's test environment before production. Needs SHIPPING_API_KEY and
 * SHIPPING_ORIGIN_POSTAL_CODE.
 */
export class BiteshipProvider implements ShippingProvider {
  readonly name = "biteship";
  private base = "https://api.biteship.com/v1";
  private key = process.env.SHIPPING_API_KEY ?? "";
  private origin = process.env.SHIPPING_ORIGIN_POSTAL_CODE ?? "";
  private couriers = process.env.SHIPPING_COURIERS ?? "jne,sicepat,jnt";

  constructor() { if (!this.key || !this.origin) throw new Error("SHIPPING_API_KEY dan SHIPPING_ORIGIN_POSTAL_CODE wajib diisi untuk Biteship."); }
  private h() { return { Authorization: this.key, "Content-Type": "application/json" }; }

  async getRates(q: Parameters<ShippingProvider["getRates"]>[0]): Promise<Rate[]> {
    const res = await fetch(`${this.base}/rates/couriers`, {
      method: "POST", headers: this.h(), cache: "no-store",
      body: JSON.stringify({ origin_postal_code: Number(this.origin), destination_postal_code: Number(q.destinationPostalCode), couriers: this.couriers, items: [{ name: "Buku", value: 0, weight: Math.max(q.weightGram, 100), quantity: 1 }] }),
    });
    if (!res.ok) throw new Error(`Biteship rates ${res.status}`);
    const j = (await res.json()) as { pricing?: { courier_code: string; courier_service_code: string; courier_name: string; courier_service_name: string; price: number; duration: string }[] };
    return (j.pricing ?? []).map((p) => ({ courier: p.courier_code.toUpperCase(), service: p.courier_service_code.toUpperCase(), label: `${p.courier_name} ${p.courier_service_name}`, cost: Math.round(p.price), etaDays: p.duration || "-" }));
  }

  async createShipment() { return { trackingNumber: null as string | null }; } // resi diinput admin saat status SHIPPED

  async getTracking(trackingNumber: string, courier: string) {
    const res = await fetch(`${this.base}/trackings/${encodeURIComponent(trackingNumber)}/couriers/${encodeURIComponent(courier.toLowerCase())}`, { headers: this.h(), cache: "no-store" });
    if (!res.ok) return { status: "Pelacakan belum tersedia", history: [] };
    const j = (await res.json()) as { status?: string; history?: { updated_at: string; note: string }[] };
    return { status: j.status ?? "-", history: (j.history ?? []).map((h) => ({ at: h.updated_at, note: h.note })) };
  }
}
