"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/admin";

export async function resolveReport(formData: FormData) {
  const staff = await requireStaff();
  const reportId = String(formData.get("reportId"));
  const decision = String(formData.get("decision")); // ACTIONED | DISMISSED
  const note = String(formData.get("resolution") ?? "").slice(0, 500) || null;

  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) return;

  await prisma.report.update({
    where: { id: reportId },
    data: {
      status: decision === "ACTIONED" ? "ACTIONED" : "DISMISSED",
      resolvedById: staff.id,
      resolvedAt: new Date(),
      resolution: note,
    },
  });
  await audit(staff.id, "RESOLVE_REPORT", report.reportedId, `${decision}: ${note ?? "no note"}`);
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
}

export async function warnUser(formData: FormData) {
  const staff = await requireStaff();
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || "Community standards reminder";
  await prisma.user.update({ where: { id: userId }, data: { warningCount: { increment: 1 } } });
  await audit(staff.id, "WARN", userId, reason);
  revalidatePath("/admin/users");
}

export async function suspendUser(formData: FormData) {
  const staff = await requireStaff();
  const userId = String(formData.get("userId"));
  const days = Math.min(365, Math.max(1, Number(formData.get("days") ?? 7)));
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || "Temporary suspension";
  await prisma.user.update({
    where: { id: userId },
    data: { status: "SUSPENDED", suspendedUntil: new Date(Date.now() + days * 86_400_000) },
  });
  await audit(staff.id, "SUSPEND", userId, `${days}d: ${reason}`);
  revalidatePath("/admin/users");
}

export async function banUser(formData: FormData) {
  const staff = await requireStaff();
  const userId = String(formData.get("userId"));
  const reason = String(formData.get("reason") ?? "").slice(0, 500) || "Permanent ban";
  await prisma.user.update({
    where: { id: userId },
    data: { status: "SUSPENDED", suspendedUntil: null }, // SUSPENDED with no end date = permanent
  });
  // End all active sessions immediately.
  await prisma.session.deleteMany({ where: { userId } });
  await audit(staff.id, "BAN", userId, reason);
  revalidatePath("/admin/users");
}

export async function reinstateUser(formData: FormData) {
  const staff = await requireStaff();
  const userId = String(formData.get("userId"));
  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE", suspendedUntil: null },
  });
  await audit(staff.id, "REINSTATE", userId, "Reinstated");
  revalidatePath("/admin/users");
}

export async function reviewPhoto(formData: FormData) {
  const staff = await requireStaff();
  const photoId = String(formData.get("photoId"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const note = String(formData.get("note") ?? "").slice(0, 300) || null;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });
  if (!photo) return;

  await prisma.photo.update({
    where: { id: photoId },
    data: {
      status: decision === "APPROVED" ? "APPROVED" : "REJECTED",
      reviewedById: staff.id,
      reviewedAt: new Date(),
      moderationNote: note,
    },
  });
  await audit(staff.id, decision === "APPROVED" ? "APPROVE_PHOTO" : "REJECT_PHOTO", photo.userId, note ?? "");
  revalidatePath("/admin/photos");
  revalidatePath("/admin");
}
