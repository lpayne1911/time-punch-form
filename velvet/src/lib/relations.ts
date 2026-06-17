import { prisma } from "./db";

// Shared relational checks used across interaction endpoints, so the rules live
// in one place (used by like, superlike, message, and photo access).

/** True if either user has blocked the other. */
export async function blockExistsBetween(a: string, b: string): Promise<boolean> {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!block;
}

/**
 * Returns the id of a real, interactable member, or null. A valid target is
 * active, not deleted, and has a completed profile. Used before spending a
 * like / paid intro so bad targets can't waste resources or create orphan rows.
 */
export async function findDiscoverableMember(userId: string): Promise<{ id: string } | null> {
  return prisma.user.findFirst({
    where: { id: userId, status: "ACTIVE", deletedAt: null, profile: { is: { completed: true } } },
    select: { id: true },
  });
}
