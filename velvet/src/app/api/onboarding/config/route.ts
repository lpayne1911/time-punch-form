import { NextResponse } from "next/server";
import { CONSENT_PLEDGE, COMMUNITY_STANDARDS, PRIVACY_PROMISE } from "@/lib/policy";
import {
  RELATIONSHIP_INTENTIONS,
  COMMUNICATION_STYLES,
  LIFESTYLE_INTERESTS,
  BOUNDARIES,
  DEALBREAKERS,
  LOOKING_FOR,
  VALUES,
  EXPERIENCE_LEVELS,
  INTENTION_INTENSITY,
  AVAILABILITY,
  MEET_READINESS,
  AGE_DISPLAY_OPTIONS,
} from "@/lib/tags";

/**
 * Static onboarding content for the native client: the versioned policy text
 * (consent pledge + community standards) and the controlled vocabularies the
 * profile steps pick from. Served from the server so the two clients share a
 * single source of truth (and re-accept when a policy version bumps).
 */
export async function GET() {
  return NextResponse.json({
    consentPledge: CONSENT_PLEDGE,
    communityStandards: COMMUNITY_STANDARDS,
    privacyPromise: PRIVACY_PROMISE,
    vocab: {
      intentions: RELATIONSHIP_INTENTIONS,
      communicationStyles: COMMUNICATION_STYLES,
      interests: LIFESTYLE_INTERESTS,
      boundaries: BOUNDARIES,
      dealbreakers: DEALBREAKERS,
      lookingFor: LOOKING_FOR,
      values: VALUES,
      experienceLevels: EXPERIENCE_LEVELS,
      intentionIntensity: INTENTION_INTENSITY,
      availability: AVAILABILITY,
      meetReadiness: MEET_READINESS,
      ageDisplay: AGE_DISPLAY_OPTIONS,
    },
  });
}
