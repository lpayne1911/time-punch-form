// Controlled vocabulary (blueprint §13). All public-facing language is neutral,
// mature, and non-explicit. There are NO free-text explicit fields anywhere —
// users pick from these curated lists. This keeps in-app text store-compliant
// and gives the matching engine structured signals (blueprint §10).

export const RELATIONSHIP_INTENTIONS = [
  "Exploring what fits",
  "Friendship & community",
  "Long-term connection",
  "Structured relationship",
  "Open / ethically non-monogamous",
  "Discreet, low-key connection",
] as const;

export const COMMUNICATION_STYLES = [
  "Direct & clear",
  "Thoughtful & slow-paced",
  "Frequent check-ins",
  "Async-friendly",
  "Boundaries-first",
] as const;

// Lifestyle interests use dynamics/structure framing, never explicit acts.
export const LIFESTYLE_INTERESTS = [
  "Roles & dynamics",
  "Power exchange dynamics",
  "Communication & negotiation",
  "Trust & vulnerability",
  "Lifestyle events & community",
  "Education & learning",
  "Sensory exploration",
  "Aftercare & support",
  "Polyamory & multiple connections",
  "Mentorship",
] as const;

export const BOUNDARIES = [
  "Hard limits always respected",
  "Communication required before meeting",
  "Slow to meet in person",
  "Discretion essential",
  "Consent reaffirmed often",
  "Sober connection preferred",
] as const;

export const LOOKING_FOR = [
  "New connections",
  "A like-minded community",
  "An ongoing dynamic",
  "Education & guidance",
  "Friendship first",
] as const;

export const VALUES = [
  "Honesty",
  "Respect",
  "Consent culture",
  "Discretion",
  "Curiosity",
  "Kindness",
  "Reliability",
] as const;

export const EXPERIENCE_LEVELS = [
  "Newcomer",
  "Exploring",
  "Experienced",
] as const;

export const VISIBILITY_OPTIONS = [
  { value: "MATCHES_ONLY", label: "Matches only — most private" },
  { value: "VERIFIED_ONLY", label: "Verified members only (default)" },
  { value: "PUBLIC_MEMBERS", label: "All members" },
] as const;

// Helpers to (de)serialize JSON-stored arrays (SQLite has no scalar lists).
export function parseTags(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(Array.from(new Set(tags)));
}

// Validate that submitted tags belong to the controlled vocabulary. Anything
// outside the allowed set is dropped — this is the enforcement point that keeps
// profile text compliant.
export function sanitizeTags(submitted: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(submitted)) return [];
  const allowedSet = new Set(allowed);
  return submitted.filter((t): t is string => typeof t === "string" && allowedSet.has(t));
}
