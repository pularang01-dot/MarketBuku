import "server-only";
import { env } from "@/lib/env";
import { DevShippingProvider } from "./dev";
import { BiteshipProvider } from "./biteship";
import type { ShippingProvider } from "./types";

export function getShippingProvider(): ShippingProvider {
  switch (env.shippingProvider) {
    case "biteship": return new BiteshipProvider();
    case "dev":
      if (env.isProd) console.warn("[shipping] DEV flat-rate adapter is active in production. Configure a real provider.");
      return new DevShippingProvider();
    default: throw new Error(`Unknown SHIPPING_PROVIDER "${env.shippingProvider}"`);
  }
}
