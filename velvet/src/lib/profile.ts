import { parseTags } from "./tags";

/**
 * How a member's age is shown to others, per their ageDisplay preference (#26).
 * EXACT → "34"; RANGE → "30–34" (5-year bucket); HIDDEN → null (don't show).
 */
export function formatAge(age: number, ageDisplay: string | null | undefined): string | null {
  if (ageDisplay === "HIDDEN") return null;
  if (ageDisplay === "RANGE") {
    const lo = Math.floor(age / 5) * 5;
    return `${lo}–${lo + 4}`;
  }
  return String(age);
}

type StrengthProfile = {
  displayName?: string | null;
  location?: string | null;
  experienceLevel?: string | null;
  intentionIntensity?: string | null;
  availability?: string | null;
  meetReadiness?: string | null;
  intentions?: string | null;
  interests?: string | null;
  communicationStyle?: string | null;
  boundaries?: string | null;
  values?: string | null;
  lookingFor?: string | null;
  promptCommunication?: string | null;
  promptBoundary?: string | null;
  promptFirstConversation?: string | null;
  promptIdealConnection?: string | null;
};

/**
 * Profile completeness (#30). Returns a percentage plus the top suggestions for
 * what to add next — better profiles get better matches.
 */
export function profileStrength(p: StrengthProfile): { pct: number; suggestions: string[] } {
  const has = (v: string | null | undefined) => Boolean(v && v.trim());
  const hasTags = (v: string | null | undefined) => parseTags(v).length > 0;
  const promptCount = [
    p.promptCommunication,
    p.promptBoundary,
    p.promptFirstConversation,
    p.promptIdealConnection,
  ].filter(has).length;

  const checks: { ok: boolean; suggestion: string }[] = [
    { ok: has(p.displayName), suggestion: "Add a display name" },
    { ok: has(p.location), suggestion: "Add your region" },
    { ok: hasTags(p.intentions), suggestion: "Pick what you're looking for" },
    { ok: hasTags(p.interests), suggestion: "Add a few interests" },
    { ok: hasTags(p.communicationStyle), suggestion: "Add your communication style" },
    { ok: hasTags(p.boundaries), suggestion: "Share your boundaries" },
    { ok: hasTags(p.values), suggestion: "Add your values" },
    { ok: hasTags(p.lookingFor), suggestion: "Say what you're hoping to find" },
    { ok: has(p.experienceLevel), suggestion: "Set your experience level" },
    { ok: has(p.intentionIntensity), suggestion: "Set how intentional you are" },
    { ok: has(p.availability), suggestion: "Add your availability" },
    { ok: has(p.meetReadiness), suggestion: "Add your meet readiness" },
    { ok: promptCount >= 1, suggestion: "Answer a prompt" },
    { ok: promptCount >= 2, suggestion: "Answer one more prompt" },
  ];

  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / checks.length) * 100);
  const suggestions = checks.filter((c) => !c.ok).map((c) => c.suggestion).slice(0, 3);
  return { pct, suggestions };
}
