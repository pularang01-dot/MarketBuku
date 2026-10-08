import "server-only";
// Distributed limiter via Upstash Redis REST when UPSTASH_REDIS_REST_URL/TOKEN are set (recommended on Vercel);
// otherwise falls back to a per-instance in-memory limiter.
const hits = new Map<string, number[]>();

function memory(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return true;
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memory(key, limit, windowMs);
  try {
    const k = `rl:${key}`;
    const res = await fetch(`${url}/pipeline`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", k], ["PEXPIRE", k, windowMs, "NX"]]), cache: "no-store",
    });
    const j = (await res.json()) as { result: number }[];
    return (j[0]?.result ?? 1) <= limit;
  } catch { return memory(key, limit, windowMs); } // fail open to local limiter, never block users on Redis outage
}
