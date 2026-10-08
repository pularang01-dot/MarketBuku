import "server-only";
import type { ShippingProvider, Rate } from "./types";

/** DEVELOPMENT-ONLY flat-rate adapter. NOT real courier pricing. Replace before launch. */
export class DevShippingProvider implements ShippingProvider {
  readonly name = "dev";
  async getRates(q: Parameters<ShippingProvider["getRates"]>[0]): Promise<Rate[]> {
    const kg = Math.max(1, Math.ceil(q.weightGram / 1000));
    return [
      { courier: "DEV", service: "REG", label: "Reguler (dev)", cost: 9000 * kg, etaDays: "3-5 hari" },
      { courier: "DEV", service: "EXPRESS", label: "Ekspres (dev)", cost: 18000 * kg, etaDays: "1-2 hari" },
    ];
  }
  async createShipment() { return { trackingNumber: null }; }
  async getTracking() { return { status: "Belum tersedia (adapter development)", history: [] }; }
}
