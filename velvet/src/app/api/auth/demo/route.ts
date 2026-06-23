import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { serializeTags } from "@/lib/tags";

const DEMO_EMAIL = "demo@demo.velvet";

/**
 * One-tap TEST login — skips the email/OTP flow entirely and signs you into a
 * fully-onboarded demo account, so previews are usable without an email sender.
 *
 * Gated behind an env flag so it's never an open auth bypass in a real launch:
 * enabled when PREVIEW_LOGIN=1 or DEMO_LOGIN=1 (or outside production). Returns
 * the bearer token the same way /api/auth/verify does for native/web clients.
 */
export async function POST() {
  const enabled =
    process.env.PREVIEW_LOGIN === "1" ||
    process.env.DEMO_LOGIN === "1" ||
    process.env.NODE_ENV !== "production";
  if (!enabled) {
    return NextResponse.json(
      { error: "Test login is disabled. Set PREVIEW_LOGIN=1 on the backend to enable it." },
      { status: 403 },
    );
  }

  // Ensure a fully-onboarded demo user exists (idempotent) so the session lands
  // straight in Discover rather than the onboarding funnel.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      ageConfirmed: true,
      dobYear: new Date().getFullYear() - 34,
      verification: "PHOTO_VERIFIED",
      consentPledgeVersion: "1.0",
      consentPledgeAcceptedAt: new Date(),
      standardsVersion: "1.0",
      standardsAcceptedAt: new Date(),
    },
    update: {},
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: "Test member",
      age: 34,
      location: "Demo City",
      experienceLevel: "Exploring",
      visibility: "PUBLIC_MEMBERS",
      completed: true,
      intentions: serializeTags(["Exploring what fits", "Friendship & community"]),
      interests: serializeTags(["Communication & negotiation", "Trust & vulnerability"]),
      communicationStyle: serializeTags(["Direct & clear"]),
      values: serializeTags(["Respect", "Consent culture", "Honesty"]),
    },
    update: {},
  });

  const token = await createSession(user.id);
  return NextResponse.json({ ok: true, token });
}
