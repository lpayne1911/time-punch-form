// Lightweight, transparent safety primitives for the MVP (blueprint §11, §17, §18).
// These are deterministic heuristics — in production they are augmented by
// dedicated text/image moderation providers (Hive, Perspective, Rekognition).
// The point of the MVP layer is that the *governance surfaces* exist and work:
// detection -> flag -> human review queue, plus report/block as first-class.

export const REPORT_CATEGORIES = [
  { value: "HARASSMENT", label: "Harassment or abuse" },
  { value: "EXPLICIT", label: "Explicit or inappropriate content" },
  { value: "SOLICITATION", label: "Solicitation / selling services" },
  { value: "SCAM", label: "Scam or financial manipulation" },
  { value: "IMPERSONATION", label: "Fake profile / impersonation" },
  { value: "THREAT", label: "Threats or violence" },
  { value: "DOXXING", label: "Sharing private information" },
  { value: "MINOR_SAFETY", label: "Possible minor (urgent)" },
  { value: "OFF_PLATFORM", label: "Pushing unsafe off-platform activity" },
  { value: "SPAM", label: "Spam" },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

// Patterns that strongly indicate prohibited intent (solicitation, off-platform
// payment, contact-info exchange used to evade moderation). A hit flags the
// message for the human review queue; it does not silently block — we keep a
// reviewable record (blueprint §18).
const SOLICITATION_PATTERNS = [
  /\b(rates?|pricing|per hour|hourly|\$\d+|deposit|cashapp|venmo|paypal|onlyfans|cash app)\b/i,
  /\b(escort|sugar (baby|daddy|momma)|companionship for|generous|allowance)\b/i,
  /\b(pay (per|for)|paid (session|meet)|donation required)\b/i,
];

const THREAT_PATTERNS = [/\b(i will (find|hurt|expose) you|or else|you'?ll regret)\b/i];

// Crude contact-info detection used to nudge (not block) early off-platform moves.
const CONTACT_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone number
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, // email
];

export type ModerationResult = {
  flagged: boolean;
  reasons: string[];
  containsContactInfo: boolean;
};

export function moderateText(text: string): ModerationResult {
  const reasons: string[] = [];
  if (SOLICITATION_PATTERNS.some((re) => re.test(text))) reasons.push("possible_solicitation");
  if (THREAT_PATTERNS.some((re) => re.test(text))) reasons.push("possible_threat");
  const containsContactInfo = CONTACT_PATTERNS.some((re) => re.test(text));
  return { flagged: reasons.length > 0, reasons, containsContactInfo };
}

// First-message consent reminder copy (blueprint §11).
export const CONSENT_REMINDER =
  "A reminder: lead with respect, honor boundaries, and never share or ask for anything beyond what's freely offered.";

// Safety nudge shown before users discuss meeting (blueprint §11).
export const MEETING_SAFETY_NUDGE =
  "Thinking of meeting? Meet somewhere public, tell a friend where you'll be, and trust your instincts. You can pause your profile or report anyone, anytime.";
