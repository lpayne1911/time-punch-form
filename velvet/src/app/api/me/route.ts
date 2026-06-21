import { NextResponse } from "next/server";
import { getCurrentUser, onboardingNext } from "@/lib/auth";
import { parseTags } from "@/lib/tags";
import { formatAge } from "@/lib/profile";

/**
 * Current member summary for the native client (Expo). Authenticated via the
 * Bearer session token. Returns just what the mobile profile/bootstrap screens
 * need — never sensitive moderation internals.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const p = user.profile;
  return NextResponse.json({
    id: user.id,
    email: user.email,
    verification: user.verification,
    ageAssured: user.ageAssured,
    onboardingNext: onboardingNext(user),
    profile: p
      ? {
          displayName: p.displayName,
          age: p.age,
          ageLabel: formatAge(p.age, p.ageDisplay),
          location: p.location,
          experienceLevel: p.experienceLevel,
          intentions: parseTags(p.intentions),
          interests: parseTags(p.interests),
          values: parseTags(p.values),
          lookingFor: parseTags(p.lookingFor),
          completed: p.completed,
        }
      : null,
  });
}
