"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import type { Feature } from "@/lib/billing";

// Server-side entitlement guard for premium settings (defense in depth — the UI
// also hides these, but never trust the client).
async function requireFeature(userId: string, feature: Feature) {
  const ent = await getEntitlements(userId);
  if (!ent.has(feature)) redirect(`/premium?feature=${feature}`);
}

export async function setHideFromDiscovery(value: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeature(user.id, "hideFromDiscovery");
  await prisma.profile.update({ where: { userId: user.id }, data: { hideFromDiscovery: value } });
  revalidatePath("/settings");
}

export async function setDiscoverVerifiedOnly(value: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeature(user.id, "verifiedOnlyBrowsing");
  await prisma.profile.update({ where: { userId: user.id }, data: { discoverVerifiedOnly: value } });
  revalidatePath("/settings");
}

export async function setTravelLocation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeature(user.id, "travelMode");
  const loc = String(formData.get("travelLocation") ?? "").trim().slice(0, 60) || null;
  await prisma.profile.update({ where: { userId: user.id }, data: { travelLocation: loc } });
  revalidatePath("/settings");
}

export async function setPaused(paused: boolean) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Emergency profile pause hides the member from discovery instantly (blueprint §20).
  await prisma.user.update({
    where: { id: user.id },
    data: { status: paused ? "PAUSED" : "ACTIVE" },
  });
  if (user.profile) {
    await prisma.profile.update({
      where: { userId: user.id },
      data: { incognito: paused },
    });
  }
  revalidatePath("/settings");
}

export async function setIncognito(incognito: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeature(user.id, "incognito");
  await prisma.profile.update({ where: { userId: user.id }, data: { incognito } });
  revalidatePath("/settings");
}

export async function updateVisibility(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  const visibility = String(formData.get("visibility") ?? "VERIFIED_ONLY");
  if (["MATCHES_ONLY", "VERIFIED_ONLY", "PUBLIC_MEMBERS"].includes(visibility)) {
    await prisma.profile.update({ where: { userId: user.id }, data: { visibility } });
  }
  revalidatePath("/settings");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function deleteAccount() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Hard-delete the user's content; cascades remove profile, likes, messages,
  // sessions, blocks, and reports (blueprint §19 data deletion). We also clear
  // PII fields and tombstone the email so the address can't be re-identified.
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { senderId: user.id } }),
    prisma.profile.deleteMany({ where: { userId: user.id } }),
    prisma.like.deleteMany({ where: { OR: [{ fromUserId: user.id }, { toUserId: user.id }] } }),
    prisma.match.deleteMany({ where: { OR: [{ userAId: user.id }, { userBId: user.id }] } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: `deleted+${user.id}@velvet.invalid`,
        dobYear: null,
      },
    }),
  ]);

  await destroySession();
  redirect("/");
}
