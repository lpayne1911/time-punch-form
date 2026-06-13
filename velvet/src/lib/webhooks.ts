import { createHmac, timingSafeEqual } from "crypto";

// HMAC-SHA256 webhook signature verification (blueprint §33 payments, §17
// verification). Real providers (RevenueCat, Stripe, Persona, Veriff) sign the
// raw request body with a shared secret and send it in a header; we recompute
// and compare in constant time. Always verify against the RAW body, never the
// re-serialized JSON.

export function computeSignature(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = computeSignature(rawBody, secret);
  // Accept "sha256=<hex>" or bare hex.
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
