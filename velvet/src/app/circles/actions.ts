"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlements } from "@/lib/entitlements";

// Private circles are reserved for the Private Circle tier (blueprint §12, §24).
async function requireCirclesAccess() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const ent = await getEntitlements(user.id);
  if (!ent.has("privateCircles")) redirect("/premium?feature=privateCircles");
  return user;
}

// Proposing a circle creates it PENDING; it isn't listed until a moderator approves.
export async function proposeCircle(formData: FormData) {
  const user = await requireCirclesAccess();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 60);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  if (!name || !topic || !description) redirect("/circles?error=1");

  const circle = await prisma.circle.create({
    data: { name, topic, description, status: "PENDING", createdById: user.id },
  });
  // The creator is auto-enrolled (approved on circle approval).
  await prisma.circleMembership.create({ data: { circleId: circle.id, userId: user.id, status: "APPROVED" } });
  redirect("/circles?proposed=1");
}

export async function requestJoin(circleId: string) {
  const user = await requireCirclesAccess();
  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle || circle.status !== "APPROVED") redirect("/circles");
  await prisma.circleMembership.upsert({
    where: { circleId_userId: { circleId, userId: user.id } },
    create: { circleId, userId: user.id, status: "PENDING" },
    update: { status: "PENDING" },
  });
  revalidatePath(`/circles/${circleId}`);
}

export async function leaveCircle(circleId: string) {
  const user = await requireCirclesAccess();
  await prisma.circleMembership.updateMany({
    where: { circleId, userId: user.id },
    data: { status: "REMOVED" },
  });
  revalidatePath(`/circles/${circleId}`);
}
