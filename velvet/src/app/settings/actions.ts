"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";
import { unlinkPhotoFiles } from "@/lib/photos";
import type { Feature } from "@/lib/billing";

// Entitlement guard for ENABLING a premium setting. Turning a premium flag OFF
// is always allowed — otherwise a lapsed subscriber could get stuck (e.g. unable
// to leave incognito). We only require the feature when switching it on.
async function requireFeatureToEnable(userId: string, feature: Feature, enabling: boolean) {
  if (!enabling) return;
  const ent = await getEntitlements(userId);
  if (!ent.has(feature)) redirect(`/premium?feature=${feature}`);
}

export async function setHideFromDiscovery(value: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeatureToEnable(user.id, "hideFromDiscovery", value);
  await prisma.profile.update({ where: { userId: user.id }, data: { hideFromDiscovery: value } });
  revalidatePath("/settings");
}

export async function setDiscoverVerifiedOnly(value: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeatureToEnable(user.id, "verifiedOnlyBrowsing", value);
  await prisma.profile.update({ where: { userId: user.id }, data: { discoverVerifiedOnly: value } });
  revalidatePath("/settings");
}

export async function setIncognito(incognito: boolean) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  await requireFeatureToEnable(user.id, "incognito", incognito);
  await prisma.profile.update({ where: { userId: user.id }, data: { incognito } });
  revalidatePath("/settings");
}

export async function setTravelLocation(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.profile) redirect("/login");
  const loc = String(formData.get("travelLocation") ?? "").trim().slice(0, 60) || null;
  // Only setting a destination is premium; clearing it is always allowed.
  await requireFeatureToEnable(user.id, "travelMode", !!loc);
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
  const uid = user.id;

  // Capture photo storage refs up front so we can remove the stored files after
  // the DB rows are gone (blueprint §19 data deletion / erasure).
  const photos = await prisma.photo.findMany({
    where: { userId: uid },
    select: { filename: true, url: true },
  });

  // Hard-delete ALL of the user's data, then tombstone the account so the email
  // can't be re-identified or reused. We explicitly delete every relation
  // (deleting events/circles cascades their rsvps/memberships).
  await prisma.$transaction([
    prisma.message.deleteMany({ where: { senderId: uid } }),
    prisma.match.deleteMany({ where: { OR: [{ userAId: uid }, { userBId: uid }] } }), // cascades remaining messages
    prisma.like.deleteMany({ where: { OR: [{ fromUserId: uid }, { toUserId: uid }] } }),
    prisma.block.deleteMany({ where: { OR: [{ blockerId: uid }, { blockedId: uid }] } }),
    prisma.report.deleteMany({ where: { OR: [{ reporterId: uid }, { reportedId: uid }] } }),
    prisma.photo.deleteMany({ where: { userId: uid } }),
    prisma.verificationCheck.deleteMany({ where: { userId: uid } }),
    prisma.subscription.deleteMany({ where: { userId: uid } }),
    prisma.purchase.deleteMany({ where: { userId: uid } }),
    prisma.credit.deleteMany({ where: { userId: uid } }),
    prisma.boost.deleteMany({ where: { userId: uid } }),
    prisma.rsvp.deleteMany({ where: { userId: uid } }),
    prisma.circleMembership.deleteMany({ where: { userId: uid } }),
    prisma.circle.deleteMany({ where: { createdById: uid } }), // cascades its memberships
    prisma.event.deleteMany({ where: { hostId: uid } }), // cascades its rsvps
    prisma.hostApplication.deleteMany({ where: { userId: uid } }),
    prisma.profile.deleteMany({ where: { userId: uid } }),
    prisma.session.deleteMany({ where: { userId: uid } }),
    prisma.user.update({
      where: { id: uid },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        email: `deleted+${uid}@velvet.invalid`,
        dobYear: null,
        ageAssured: false,
        verification: "UNVERIFIED",
        isHost: false,
      },
    }),
  ]);

  // Remove the stored image files (best-effort, after the rows are gone).
  await unlinkPhotoFiles(photos);

  await destroySession();
  redirect("/");
}
