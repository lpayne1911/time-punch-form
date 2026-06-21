import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import type { Feature } from "@/lib/billing";

/** Current privacy / safety settings for the native Settings screen. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const p = user.profile;
  const ent = await getEntitlements(user.id);

  return NextResponse.json({
    tier: ent.tier,
    isPaid: ent.isPaid,
    features: Array.from(ent.features),
    paused: user.status === "PAUSED",
    visibility: p?.visibility ?? "VERIFIED_ONLY",
    incognito: p?.incognito ?? false,
    hideFromDiscovery: p?.hideFromDiscovery ?? false,
    discoverVerifiedOnly: p?.discoverVerifiedOnly ?? false,
    discreetNotifications: p?.discreetNotifications ?? true,
  });
}

const BOOL_SETTINGS: Record<string, Feature | null> = {
  // key -> the entitlement required to ENABLE it (null = always free to toggle)
  incognito: "incognito",
  hideFromDiscovery: "hideFromDiscovery",
  discoverVerifiedOnly: "verifiedOnlyBrowsing",
  discreetNotifications: null,
  paused: null,
};

const schema = z.union([
  z.object({ key: z.enum(["incognito", "hideFromDiscovery", "discoverVerifiedOnly", "discreetNotifications", "paused"]), value: z.boolean() }),
  z.object({ key: z.literal("visibility"), value: z.enum(["MATCHES_ONLY", "VERIFIED_ONLY", "PUBLIC_MEMBERS"]) }),
]);

/**
 * Update a single setting. Turning a premium flag ON requires the entitlement
 * (returns 402 with an upgrade hint); turning it OFF is always allowed so a
 * lapsed subscriber never gets stuck (mirrors settings/actions.ts).
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  // NOTE: narrow off `parsed.data` directly (not destructured) so the
  // discriminated union keeps `value`'s type correlated with `key`.
  const d = parsed.data;

  if (d.key === "visibility") {
    if (!user.profile) return NextResponse.json({ error: "Finish your profile first." }, { status: 400 });
    await prisma.profile.update({ where: { userId: user.id }, data: { visibility: d.value } });
    return NextResponse.json({ ok: true });
  }

  // Boolean settings — guard premium ones when enabling.
  const requiredFeature = BOOL_SETTINGS[d.key];
  if (requiredFeature && d.value) {
    const ent = await getEntitlements(user.id);
    if (!ent.has(requiredFeature)) {
      return NextResponse.json(
        { error: "upgrade_required", message: "That's a premium privacy feature.", upgrade: requiredFeature },
        { status: 402 },
      );
    }
  }

  if (d.key === "paused") {
    // Emergency profile pause hides the member from discovery instantly (§20).
    await prisma.user.update({ where: { id: user.id }, data: { status: d.value ? "PAUSED" : "ACTIVE" } });
    if (user.profile) {
      await prisma.profile.update({ where: { userId: user.id }, data: { incognito: d.value } });
    }
    return NextResponse.json({ ok: true });
  }

  if (!user.profile) return NextResponse.json({ error: "Finish your profile first." }, { status: 400 });

  // Explicit per-field update (avoids a computed-key object that wouldn't satisfy
  // Prisma's strict input type).
  switch (d.key) {
    case "incognito":
      await prisma.profile.update({ where: { userId: user.id }, data: { incognito: d.value } });
      break;
    case "hideFromDiscovery":
      await prisma.profile.update({ where: { userId: user.id }, data: { hideFromDiscovery: d.value } });
      break;
    case "discoverVerifiedOnly":
      await prisma.profile.update({ where: { userId: user.id }, data: { discoverVerifiedOnly: d.value } });
      break;
    case "discreetNotifications":
      await prisma.profile.update({ where: { userId: user.id }, data: { discreetNotifications: d.value } });
      break;
  }
  return NextResponse.json({ ok: true });
}
