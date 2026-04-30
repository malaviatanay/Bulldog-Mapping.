/**
 * Lightweight in-memory token-bucket rate limiter.
 *
 * Notes:
 * - This runs per Node process. On Vercel serverless, multiple instances mean
 *   the limit is loose — an attacker still can't burn quotas indefinitely
 *   from one IP, but a determined adversary can multiply throughput by the
 *   number of warm instances. For tighter limits, swap this for Upstash Redis.
 * - We key by `key` (typically client IP, optionally combined with user id).
 * - Buckets older than 10 minutes are evicted to keep memory bounded.
 */

type Bucket = {
  tokens: number;
  updatedAt: number;
};

const buckets = new Map<string, Bucket>();
const EVICT_AFTER_MS = 10 * 60 * 1000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  for (const [k, b] of buckets) {
    if (now - b.updatedAt > EVICT_AFTER_MS) buckets.delete(k);
  }
  lastSweep = now;
}

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetMs: number;
};

/**
 * @param key Unique identifier (e.g. IP, user id, or both joined)
 * @param capacity Max tokens (burst size)
 * @param refillPerMinute Steady-state requests per minute
 */
export function rateLimit(
  key: string,
  capacity: number,
  refillPerMinute: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const refillPerMs = refillPerMinute / 60_000;
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: capacity, updatedAt: now };
    buckets.set(key, bucket);
  } else {
    const elapsed = now - bucket.updatedAt;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillPerMs);
    bucket.updatedAt = now;
  }

  if (bucket.tokens < 1) {
    const resetMs = Math.ceil((1 - bucket.tokens) / refillPerMs);
    return { allowed: false, remaining: 0, resetMs };
  }
  bucket.tokens -= 1;
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    resetMs: 0,
  };
}

/** Best-effort client IP extraction across common reverse proxies. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    "unknown"
  );
}
