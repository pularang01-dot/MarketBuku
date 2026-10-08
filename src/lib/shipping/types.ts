export interface RateQuery { destinationCity: string; destinationPostalCode: string; weightGram: number }
export interface Rate { courier: string; service: string; label: string; cost: number; etaDays: string }
export interface ShippingProvider {
  readonly name: string;
  getRates(q: RateQuery): Promise<Rate[]>;
  createShipment(orderId: string, rate: { courier: string; service: string }): Promise<{ trackingNumber: string | null }>;
  getTracking(trackingNumber: string, courier: string): Promise<{ status: string; history: { at: string; note: string }[] }>;
}
