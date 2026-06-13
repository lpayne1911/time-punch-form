import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { prisma } from "./db";

export const STAFF_ROLES = ["MODERATOR", "ADMIN"] as const;

export function isStaff(role: string | undefined | null): boolean {
  return role === "MODERATOR" || role === "ADMIN";
}

/**
 * Guard for the moderation dashboard. Unlike requireOnboarded, staff do not need
 * a completed dating profile — they just need a staff role (blueprint §36).
 */
export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaff(user.role)) redirect("/");
  return user;
}

/**
 * Append-only audit entry for every moderator action (blueprint §17, §36).
 */
export async function audit(
  actorId: string,
  action: string,
  targetUserId?: string | null,
  detail?: string,
) {
  await prisma.auditLog.create({
    data: { actorId, action, targetUserId: targetUserId ?? null, detail: detail ?? null },
  });
}
