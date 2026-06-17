// Lightweight in-memory sliding-window rate limiter.
//
// PRODUCTION: replace the in-memory Map with a shared store (Redis / Upstash) so
// limits hold across instances. The interface here is intentionally tiny so the
// swap is a one-file change. This protects abuse-prone endpoints — especially
// OTP request/verify (blueprint §40 security; prevents code brute-force & spam).

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Periodically drop expired buckets so the Map doesn't grow unbounded.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

/**
 * Allow up to `limit` events per `windowMs` for a given key. Returns whether the
 * current event is allowed plus how long until the window resets.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  hit.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((hit.resetAt - now) / 1000));
  if (hit.count > limit) return { ok: false, remaining: 0, retryAfterSec };
  return { ok: true, remaining: limit - hit.count, retryAfterSec };
}

// Best-effort client IP from common proxy headers (the platform sets these).
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
