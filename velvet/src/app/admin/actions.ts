"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff, audit } from "@/lib/admin";
import { applyDecision } from "@/lib/verification";

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

// --- Verification review (blueprint §17) ---
// For checks that need a human decision (e.g. flagged ID documents). Automated
// provider results normally arrive via the webhook without manual review.
export async function reviewVerification(formData: FormData) {
  const staff = await requireStaff();
  const checkId = String(formData.get("checkId"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const note = String(formData.get("note") ?? "").slice(0, 500) || undefined;
  await applyDecision({ checkId, approved: decision === "APPROVED", reviewerId: staff.id, note });
  revalidatePath("/admin/verification");
}

// --- Message moderation (blueprint §11, §18) ---
// Quarantined (high-severity) messages are withheld from the recipient until a
// moderator releases them (delivers + clears the flag) or removes them.
export async function reviewMessage(formData: FormData) {
  const staff = await requireStaff();
  const messageId = String(formData.get("messageId"));
  const decision = String(formData.get("decision")); // RELEASE | REMOVE
  const msg = await prisma.message.findUnique({ where: { id: messageId } });
  if (!msg) return;

  if (decision === "REMOVE") {
    await prisma.message.delete({ where: { id: messageId } });
    await audit(staff.id, "REMOVE_MESSAGE", msg.senderId, msg.body.slice(0, 120));
  } else {
    await prisma.message.update({ where: { id: messageId }, data: { quarantined: false, flagged: false } });
    await audit(staff.id, "RELEASE_MESSAGE", msg.senderId, msg.body.slice(0, 120));
  }
  revalidatePath("/admin/messages");
  revalidatePath("/admin");
}

// --- Community & events moderation (blueprint §12, §26, §27, §36) ---

export async function reviewHostApplication(formData: FormData) {
  const staff = await requireStaff();
  const userId = String(formData.get("userId"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const note = String(formData.get("note") ?? "").slice(0, 500) || null;
  const approved = decision === "APPROVED";

  await prisma.hostApplication.update({
    where: { userId },
    data: { status: approved ? "APPROVED" : "REJECTED", reviewedById: staff.id, reviewedAt: new Date(), note },
  });
  await prisma.user.update({ where: { id: userId }, data: { isHost: approved } });
  await audit(staff.id, approved ? "APPROVE_HOST" : "REJECT_HOST", userId, note ?? "");
  revalidatePath("/admin/community");
}

export async function reviewEvent(formData: FormData) {
  const staff = await requireStaff();
  const eventId = String(formData.get("eventId"));
  const decision = String(formData.get("decision")); // APPROVED | REJECTED
  const note = String(formData.get("note") ?? "").slice(0, 500) || null;
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  await prisma.event.update({
    where: { id: eventId },
    data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", reviewedById: staff.id, reviewedAt: new Date(), moderationNote: note },
  });
  await audit(staff.id, decision === "APPROVED" ? "APPROVE_EVENT" : "REJECT_EVENT", event.hostId, `${event.title}: ${note ?? ""}`);
  revalidatePath("/admin/community");
}

export async function reviewCircle(formData: FormData) {
  const staff = await requireStaff();
  const circleId = String(formData.get("circleId"));
  const decision = String(formData.get("decision"));
  const circle = await prisma.circle.findUnique({ where: { id: circleId } });
  if (!circle) return;

  await prisma.circle.update({
    where: { id: circleId },
    data: { status: decision === "APPROVED" ? "APPROVED" : "REJECTED", reviewedById: staff.id, reviewedAt: new Date() },
  });
  await audit(staff.id, decision === "APPROVED" ? "APPROVE_CIRCLE" : "REJECT_CIRCLE", circle.createdById, circle.name);
  revalidatePath("/admin/community");
}

export async function reviewMembership(formData: FormData) {
  const staff = await requireStaff();
  const membershipId = String(formData.get("membershipId"));
  const decision = String(formData.get("decision")); // APPROVED | REMOVED
  const m = await prisma.circleMembership.update({
    where: { id: membershipId },
    data: { status: decision === "APPROVED" ? "APPROVED" : "REMOVED" },
  });
  await audit(staff.id, decision === "APPROVED" ? "APPROVE_MEMBERSHIP" : "DENY_MEMBERSHIP", m.userId, m.circleId);
  revalidatePath("/admin/community");
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
