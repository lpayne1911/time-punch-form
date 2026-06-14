"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, onboardingNext } from "@/lib/auth";
import {
  CONSENT_PLEDGE_VERSION,
  STANDARDS_VERSION,
} from "@/lib/policy";
import { moderateText } from "@/lib/safety";
import {
  sanitizeTags,
  serializeTags,
  RELATIONSHIP_INTENTIONS,
  COMMUNICATION_STYLES,
  LIFESTYLE_INTERESTS,
  BOUNDARIES,
  LOOKING_FOR,
  VALUES,
  EXPERIENCE_LEVELS,
} from "@/lib/tags";

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function confirmAge(formData: FormData) {
  const user = await requireUser();
  const over18 = formData.get("over18") === "on";
  const dobYearRaw = formData.get("dobYear");
  const dobYear = dobYearRaw ? Number(dobYearRaw) : null;
  const currentYear = new Date().getFullYear();

  // Hard age gate (blueprint §7/§8). Self-attested 18+, with a coarse DOB year
  // sanity check. Full age assurance (provider) is a later phase.
  if (!over18 || !dobYear || currentYear - dobYear < 18 || currentYear - dobYear > 120) {
    redirect("/onboarding/age?error=1");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { ageConfirmed: true, dobYear },
  });
  redirect("/onboarding/consent");
}

export async function acceptConsent() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { consentPledgeVersion: CONSENT_PLEDGE_VERSION, consentPledgeAcceptedAt: new Date() },
  });
  redirect("/onboarding/standards");
}

export async function acceptStandards() {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { standardsVersion: STANDARDS_VERSION, standardsAcceptedAt: new Date() },
  });
  redirect("/onboarding/profile");
}

export async function saveProfile(formData: FormData) {
  const user = await requireUser();

  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40);
  const age = Number(formData.get("age"));
  const location = String(formData.get("location") ?? "").trim().slice(0, 60);
  const experienceLevel = String(formData.get("experienceLevel") ?? "");
  const visibility = String(formData.get("visibility") ?? "VERIFIED_ONLY");

  // Tags arrive as repeated form fields; sanitize against controlled vocab.
  const intentions = sanitizeTags(formData.getAll("intentions"), RELATIONSHIP_INTENTIONS);
  const communicationStyle = sanitizeTags(formData.getAll("communicationStyle"), COMMUNICATION_STYLES);
  const interests = sanitizeTags(formData.getAll("interests"), LIFESTYLE_INTERESTS);
  const boundaries = sanitizeTags(formData.getAll("boundaries"), BOUNDARIES);
  const lookingFor = sanitizeTags(formData.getAll("lookingFor"), LOOKING_FOR);
  const values = sanitizeTags(formData.getAll("values"), VALUES);

  const promptCommunication = String(formData.get("promptCommunication") ?? "").trim().slice(0, 280);
  const promptBoundary = String(formData.get("promptBoundary") ?? "").trim().slice(0, 280);

  // Free-text prompts are the one non-vocabulary channel on a profile, so they
  // must be screened (blueprint §13, §18). Flag solicitation/threat patterns or
  // contact info and reject the save rather than store explicit/solicitation text.
  for (const text of [promptCommunication, promptBoundary]) {
    if (!text) continue;
    const mod = moderateText(text);
    if (mod.flagged || mod.containsContactInfo) {
      redirect("/onboarding/profile?error=prompt");
    }
  }

  const validExperience = (EXPERIENCE_LEVELS as readonly string[]).includes(experienceLevel)
    ? experienceLevel
    : null;
  const validVisibility = ["MATCHES_ONLY", "VERIFIED_ONLY", "PUBLIC_MEMBERS"].includes(visibility)
    ? visibility
    : "VERIFIED_ONLY";

  if (!displayName || !age || age < 18 || age > 120 || !location) {
    redirect("/onboarding/profile?error=1");
  }

  const completed = displayName.length > 0 && interests.length > 0 && intentions.length > 0;

  const data = {
    displayName,
    age,
    location,
    experienceLevel: validExperience,
    visibility: validVisibility,
    intentions: serializeTags(intentions),
    communicationStyle: serializeTags(communicationStyle),
    interests: serializeTags(interests),
    boundaries: serializeTags(boundaries),
    lookingFor: serializeTags(lookingFor),
    values: serializeTags(values),
    promptCommunication: promptCommunication || null,
    promptBoundary: promptBoundary || null,
    completed,
  };

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  });

  const refreshed = await getCurrentUser();
  redirect(refreshed ? onboardingNext(refreshed) ?? "/discover" : "/discover");
}
