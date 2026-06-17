import { prisma } from "./db";
import { ItemKind, itemForKind, BOOST_DURATION_MIN, TRAVEL_PASS_DURATION_HRS } from "./shop";

// Credit balances and consumption for à-la-carte items (blueprint §25).

export async function getCredits(userId: string): Promise<Record<string, number>> {
  const rows = await prisma.credit.findMany({ where: { userId } });
  const out: Record<string, number> = {};
  for (const r of rows) out[r.kind] = r.remaining;
  return out;
}

// Records a (dev) purchase and grants the item's credits. On real devices this
// is driven by a verified store-billing webhook, not a client call.
export async function grantPurchase(userId: string, kind: ItemKind) {
  const item = itemForKind(kind);
  if (!item) throw new Error("unknown item");
  await prisma.purchase.create({
    data: { userId, kind, quantity: item.quantity, priceCents: item.priceCents, provider: "dev" },
  });
  await prisma.credit.upsert({
    where: { userId_kind: { userId, kind } },
    create: { userId, kind, remaining: item.quantity },
    update: { remaining: { increment: item.quantity } },
  });
}

// Atomically consume one credit; returns false if none available.
async function consume(userId: string, kind: ItemKind): Promise<boolean> {
  const res = await prisma.credit.updateMany({
    where: { userId, kind, remaining: { gte: 1 } },
    data: { remaining: { decrement: 1 } },
  });
  return res.count > 0;
}

export async function activateBoost(userId: string): Promise<boolean> {
  if (!(await consume(userId, "BOOST"))) return false;
  await prisma.boost.create({
    data: { userId, expiresAt: new Date(Date.now() + BOOST_DURATION_MIN * 60_000) },
  });
  return true;
}

export async function activateTravelPass(userId: string, location: string): Promise<boolean> {
  if (!(await consume(userId, "TRAVEL_PASS"))) return false;
  await prisma.profile.update({
    where: { userId },
    data: { travelLocation: location, travelExpiresAt: new Date(Date.now() + TRAVEL_PASS_DURATION_HRS * 3_600_000) },
  });
  return true;
}

export async function useSuperLike(userId: string): Promise<boolean> {
  return consume(userId, "SUPER_LIKE");
}

// Return a consumed credit (used if the downstream action fails after consume).
export async function refundSuperLike(userId: string): Promise<void> {
  await prisma.credit.upsert({
    where: { userId_kind: { userId, kind: "SUPER_LIKE" } },
    create: { userId, kind: "SUPER_LIKE", remaining: 1 },
    update: { remaining: { increment: 1 } },
  });
}

export async function hasActiveBoost(userId: string): Promise<boolean> {
  const b = await prisma.boost.findFirst({ where: { userId, expiresAt: { gt: new Date() } } });
  return !!b;
}

// Set of user ids with an active boost (for ranking in discovery).
export async function boostedUserIds(): Promise<Set<string>> {
  const rows = await prisma.boost.findMany({
    where: { expiresAt: { gt: new Date() } },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}
