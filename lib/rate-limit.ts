/**
 * In-memory sliding-window rate limiter. Good enough for a single Vercel
 * region; swap the store for Upstash Redis when multi-region (documented in
 * /docs/plan.md). Keyed by <route>:<userId or ip>. No PII stored beyond ids.
 */
type Bucket = { hits: number[]; };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): { ok: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < windowMs);
  const ok = b.hits.length < limit;
  if (ok) b.hits.push(now);
  buckets.set(key, b);
  if (buckets.size > 5000) {
    // crude GC to prevent unbounded growth
    for (const [k, v] of Array.from(buckets.entries())) {
      if (!v.hits.length || now - v.hits[v.hits.length - 1] > 300_000) buckets.delete(k);
    }
  }
  return {
    ok,
    remaining: Math.max(0, limit - b.hits.length),
    resetIn: b.hits.length ? Math.ceil((windowMs - (now - b.hits[0])) / 1000) : 0,
  };
}
