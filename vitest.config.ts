import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import path from "path";

config({ path: ".env.local" }); // lets integration tests read Supabase keys
export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 30_000 },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
