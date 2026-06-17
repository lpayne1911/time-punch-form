import { prisma } from "./db";
import {
  ActiveSub,
  Feature,
  Tier,
  effectiveTier,
  featuresFor,
  hasFeature,
  FREE_DAILY_LIKE_LIMIT,
} from "./billing";

export async function getSubscription(userId: string): Promise<ActiveSub> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return null;
  return {
    tier: sub.tier as Tier,
    status: sub.status,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}

export type Entitlements = {
  tier: Tier;
  features: Set<Feature>;
  has: (f: Feature) => boolean;
  isPaid: boolean;
};

export async function getEntitlements(userId: string): Promise<Entitlements> {
  const sub = await getSubscription(userId);
  const tier = effectiveTier(sub);
  const features = featuresFor(tier);
  return {
    tier,
    features,
    has: (f) => features.has(f),
    isPaid: tier !== "FREE",
  };
}

export { hasFeature };

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Free members have a daily like cap (a gentle conversion lever, blueprint §29/§30).
 * Paid tiers with `unlimitedLikes` bypass it. Returns remaining likes today.
 */
export async function likesRemainingToday(userId: string): Promise<number | "unlimited"> {
  const ent = await getEntitlements(userId);
  if (ent.has("unlimitedLikes")) return "unlimited";
  // Purchased "thoughtful intros" (super-likes) are paid for separately and must
  // not burn a free daily like (audit #9).
  const used = await prisma.like.count({
    where: { fromUserId: userId, superLike: false, createdAt: { gte: startOfToday() } },
  });
  return Math.max(0, FREE_DAILY_LIKE_LIMIT - used);
}
