import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseTags } from "@/lib/tags";

// Self-serve data export (blueprint §19, §22). Returns the member's own data as
// a downloadable JSON file.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const full = await prisma.user.findUnique({
    where: { id: user.id },
    include: { profile: true, messages: true },
  });
  if (!full) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      email: full.email,
      ageConfirmed: full.ageConfirmed,
      verification: full.verification,
      status: full.status,
      createdAt: full.createdAt,
      consentPledgeAcceptedAt: full.consentPledgeAcceptedAt,
      standardsAcceptedAt: full.standardsAcceptedAt,
    },
    profile: full.profile && {
      displayName: full.profile.displayName,
      age: full.profile.age,
      location: full.profile.location,
      intentions: parseTags(full.profile.intentions),
      interests: parseTags(full.profile.interests),
      communicationStyle: parseTags(full.profile.communicationStyle),
      boundaries: parseTags(full.profile.boundaries),
      lookingFor: parseTags(full.profile.lookingFor),
      values: parseTags(full.profile.values),
      experienceLevel: full.profile.experienceLevel,
      visibility: full.profile.visibility,
    },
    messages: full.messages.map((m) => ({ body: m.body, createdAt: m.createdAt })),
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="velvet-data-export.json"',
    },
  });
}
