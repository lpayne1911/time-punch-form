// Community & events domain (blueprint §12, §26, §27). All categories are
// non-explicit, lawful, and consent/education/social-oriented. There is NO
// category for explicit activity, paid sexual access, or solicitation.

export const EVENT_CATEGORIES = [
  { value: "SOCIAL_MIXER", label: "Lifestyle-neutral social mixer" },
  { value: "CONSENT_SEMINAR", label: "Consent & communication seminar" },
  { value: "COMMUNICATION_WORKSHOP", label: "Communication workshop" },
  { value: "RELATIONSHIP_EDUCATION", label: "Relationship education" },
  { value: "COMMUNITY_MEETUP", label: "Community meetup" },
  { value: "SKILLS_WORKSHOP", label: "Educational skills workshop" },
] as const;

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  EVENT_CATEGORIES.map((c) => [c.value, c.label]),
);

export const EVENT_FORMATS = [
  { value: "IN_PERSON", label: "In person" },
  { value: "ONLINE", label: "Online" },
] as const;

// Shown to hosts during creation and to attendees on the listing (blueprint §12).
export const EVENT_RULES = [
  "Events must be lawful, consent-centered, and respectful.",
  "No explicit activity, nudity, or sexual services — advertised or implied.",
  "No solicitation, paid companionship, or off-platform 'services'.",
  "A clear code of conduct applies; attendees can report and leave anytime.",
  "Hosts are verified and every event is reviewed before it goes live.",
];

export const REFUND_POLICY =
  "Free events: cancel your RSVP anytime. Paid tickets: full refund if you cancel at least 48 hours before the event, or if the host cancels. Refunds are issued to your original payment method.";

// Platform economics (blueprint §26). Paid tickets are real-world goods settled
// by an external processor (Stripe Connect); hosts receive payouts minus the
// platform fee and are responsible for their own taxes (platform issues forms).
export const PLATFORM_FEE_PCT = 15;

export function hostPayoutCents(priceCents: number, attendees: number): number {
  const gross = priceCents * attendees;
  return Math.round(gross * (1 - PLATFORM_FEE_PCT / 100));
}

export function formatPrice(cents: number): string {
  return cents === 0 ? "Free" : `$${(cents / 100).toFixed(2)}`;
}

export function isValidCategory(v: string): boolean {
  return EVENT_CATEGORIES.some((c) => c.value === v);
}
