import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, onboardingNext } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CONSENT_PLEDGE_VERSION, STANDARDS_VERSION } from "@/lib/policy";
import {
  sanitizeTags,
  serializeTags,
  parseTags,
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
} from "@/lib/tags";

const strings = z.array(z.string()).default([]);

const schema = z.discriminatedUnion("step", [
  z.object({ step: z.literal("age"), over18: z.boolean(), dobYear: z.number().int() }),
  z.object({ step: z.literal("consent") }),
  z.object({ step: z.literal("standards") }),
  z.object({
    step: z.literal("basics"),
    displayName: z.string(),
    location: z.string(),
    intentions: strings,
  }),
  z.object({
    step: z.literal("profile"),
    interests: strings,
    communicationStyle: strings,
    boundaries: strings,
    dealbreakers: strings,
    lookingFor: strings,
    values: strings,
    experienceLevel: z.string().optional(),
    visibility: z.string().optional(),
    intentionIntensity: z.string().optional(),
    availability: z.string().optional(),
    meetReadiness: z.string().optional(),
    ageDisplay: z.string().optional(),
  }),
]);

const pick = (raw: string | undefined, allowed: readonly string[]) =>
  raw && allowed.includes(raw) ? raw : null;

/**
 * Single bearer-authenticated entry point for the native onboarding funnel.
 * Mirrors the web server actions (blueprint §7/§8) step-by-step and returns the
 * next required gate (`null` once the member can browse).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const d = parsed.data;

  switch (d.step) {
    case "age": {
      const currentYear = new Date().getFullYear();
      const ageOk = d.over18 && currentYear - d.dobYear >= 18 && currentYear - d.dobYear <= 120;
      if (!ageOk) {
        return NextResponse.json({ error: "You must be 18 or older to use Velvet." }, { status: 400 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { ageConfirmed: true, dobYear: d.dobYear },
      });
      break;
    }
    case "consent":
      await prisma.user.update({
        where: { id: user.id },
        data: { consentPledgeVersion: CONSENT_PLEDGE_VERSION, consentPledgeAcceptedAt: new Date() },
      });
      break;
    case "standards":
      await prisma.user.update({
        where: { id: user.id },
        data: { standardsVersion: STANDARDS_VERSION, standardsAcceptedAt: new Date() },
      });
      break;
    case "basics": {
      const displayName = d.displayName.trim().slice(0, 40);
      const location = d.location.trim().slice(0, 60);
      const intentions = sanitizeTags(d.intentions, RELATIONSHIP_INTENTIONS);
      const age = user.dobYear ? new Date().getFullYear() - user.dobYear : 0;
      if (!displayName || !location || intentions.length === 0 || age < 18) {
        return NextResponse.json({ error: "Add a name, area, and at least one intention." }, { status: 400 });
      }
      await prisma.profile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          displayName,
          location,
          age,
          intentions: serializeTags(intentions),
          completed: false,
        },
        update: { displayName, location, age, intentions: serializeTags(intentions) },
      });
      break;
    }
    case "profile": {
      const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
      if (!profile) {
        return NextResponse.json({ error: "Finish the basics step first." }, { status: 400 });
      }
      const interests = sanitizeTags(d.interests, LIFESTYLE_INTERESTS);
      const data = {
        experienceLevel: pick(d.experienceLevel, EXPERIENCE_LEVELS),
        visibility: ["MATCHES_ONLY", "VERIFIED_ONLY", "PUBLIC_MEMBERS"].includes(d.visibility ?? "")
          ? d.visibility!
          : "VERIFIED_ONLY",
        ageDisplay: ["EXACT", "RANGE", "HIDDEN"].includes(d.ageDisplay ?? "") ? d.ageDisplay! : "EXACT",
        intentionIntensity: pick(d.intentionIntensity, INTENTION_INTENSITY),
        availability: pick(d.availability, AVAILABILITY),
        meetReadiness: pick(d.meetReadiness, MEET_READINESS),
        interests: serializeTags(interests),
        communicationStyle: serializeTags(sanitizeTags(d.communicationStyle, COMMUNICATION_STYLES)),
        boundaries: serializeTags(sanitizeTags(d.boundaries, BOUNDARIES)),
        dealbreakers: serializeTags(sanitizeTags(d.dealbreakers, DEALBREAKERS)),
        lookingFor: serializeTags(sanitizeTags(d.lookingFor, LOOKING_FOR)),
        values: serializeTags(sanitizeTags(d.values, VALUES)),
        // Discoverable once there's a name, an intention, and at least one interest.
        completed:
          profile.displayName.length > 0 &&
          parseTags(profile.intentions).length > 0 &&
          interests.length > 0,
      };
      await prisma.profile.update({ where: { userId: user.id }, data });
      break;
    }
  }

  const refreshed = await getCurrentUser();
  return NextResponse.json({ ok: true, next: refreshed ? onboardingNext(refreshed) : null });
}
