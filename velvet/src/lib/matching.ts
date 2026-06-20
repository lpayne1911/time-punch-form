import { prisma } from "./db";
import { parseTags } from "./tags";
import { formatAge } from "./profile";
import { boostedUserIds } from "./purchases";
import { BOOST_SCORE_BONUS } from "./shop";
import { getEntitlements } from "./entitlements";
import { effectiveTier, featuresFor, type Tier } from "./billing";

// Compatibility scoring (blueprint §10). Matching is values/compatibility-based,
// NOT appearance-based: photos are blurred pre-match and contribute nothing to
// the score. We surface a human-readable "why you're compatible" reason so users
// never feel ranked or objectified — there is no public desirability score.

type ProfileLike = {
  intentions: string;
  communicationStyle: string;
  interests: string;
  boundaries: string;
  values: string;
  experienceLevel: string | null;
};

const WEIGHTS = {
  interests: 3,
  intentions: 4,
  communication: 2,
  boundaries: 3,
  values: 2,
};

function overlap(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((x) => setB.has(x));
}

export type FitBand = "Strong fit" | "Some overlap" | "Different pace";

export type Candidate = {
  userId: string;
  displayName: string;
  age: number;
  ageLabel: string | null;
  location: string;
  experienceLevel: string | null;
  verification: string;
  interests: string[];
  intentions: string[];
  values: string[];
  score: number;
  reason: string;
  reasons: string[];
  fit: FitBand;
  photoBlurred: boolean;
};

export type DiscoverFilters = {
  intention?: string;
  experience?: string;
  verifiedOnly?: boolean;
};

/**
 * Soft, non-numeric compatibility band (blueprint §10 — no public desirability
 * score). Keeps the signal warm: we never show a percentage or rank.
 */
function fitBand(score: number): FitBand {
  if (score >= 12) return "Strong fit";
  if (score >= 5) return "Some overlap";
  return "Different pace";
}

function scorePair(me: ProfileLike, them: ProfileLike): { score: number; reasons: string[] } {
  const sharedInterests = overlap(parseTags(me.interests), parseTags(them.interests));
  const sharedIntentions = overlap(parseTags(me.intentions), parseTags(them.intentions));
  const sharedComm = overlap(parseTags(me.communicationStyle), parseTags(them.communicationStyle));
  const sharedBoundaries = overlap(parseTags(me.boundaries), parseTags(them.boundaries));
  const sharedValues = overlap(parseTags(me.values), parseTags(them.values));

  const score =
    sharedInterests.length * WEIGHTS.interests +
    sharedIntentions.length * WEIGHTS.intentions +
    sharedComm.length * WEIGHTS.communication +
    sharedBoundaries.length * WEIGHTS.boundaries +
    sharedValues.length * WEIGHTS.values;

  // Up to three warm, non-objectifying "why we matched" reasons, strongest first.
  const reasons: string[] = [];
  if (sharedIntentions.length) reasons.push(`You're both looking for ${sharedIntentions[0].toLowerCase()}`);
  if (sharedBoundaries.length) reasons.push(`Aligned on boundaries that matter`);
  if (sharedInterests.length) reasons.push(`Shared interest in ${sharedInterests[0].toLowerCase()}`);
  if (sharedComm.length) reasons.push(`Similar communication style: ${sharedComm[0].toLowerCase()}`);
  if (sharedValues.length) reasons.push(`You both value ${sharedValues[0].toLowerCase()}`);
  if (reasons.length === 0) reasons.push("You share a thoughtful approach to connection");

  return { score, reasons: reasons.slice(0, 3) };
}

/**
 * Returns ranked, compatible candidates for a user, excluding:
 * blocked/blocking users, already-liked users, suspended/deleted accounts,
 * and incognito profiles. Respects each candidate's visibility setting.
 */
export async function getCandidates(
  userId: string,
  limit = 20,
  filters: DiscoverFilters = {},
): Promise<Candidate[]> {
  const me = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!me?.profile) return [];

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
  });
  const blockedIds = new Set<string>();
  for (const b of blocks) {
    blockedIds.add(b.blockerId === userId ? b.blockedId : b.blockerId);
  }

  const liked = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
  const likedIds = new Set(liked.map((l) => l.toUserId));

  // The viewer's premium "verified-only browsing" filter only applies while the
  // viewer is actually entitled (entitlements are re-checked on read, not trusted
  // from the stored flag — blueprint §24).
  const myEnt = await getEntitlements(userId);
  const applyVerifiedOnly = me.profile.discoverVerifiedOnly && myEnt.has("verifiedOnlyBrowsing");

  const others = await prisma.user.findMany({
    where: {
      id: { not: userId },
      status: "ACTIVE",
      deletedAt: null,
      profile: { is: { completed: true } },
      ...(applyVerifiedOnly ? { verification: { not: "UNVERIFIED" } } : {}),
    },
    include: { profile: true, subscription: true },
    take: 200,
  });

  const myVerified = me.verification !== "UNVERIFIED";
  const boosted = await boostedUserIds(); // à-la-carte boost ranking (blueprint §25)

  const candidates: Candidate[] = [];
  for (const other of others) {
    if (!other.profile) continue;
    if (blockedIds.has(other.id) || likedIds.has(other.id)) continue;

    // Honor incognito / hide-from-discovery ONLY if the candidate currently holds
    // the entitlement — a lapsed subscriber no longer gets the privacy benefit.
    const theirFeatures = featuresFor(
      effectiveTier(
        other.subscription
          ? {
              tier: other.subscription.tier as Tier,
              status: other.subscription.status,
              currentPeriodEnd: other.subscription.currentPeriodEnd,
              cancelAtPeriodEnd: other.subscription.cancelAtPeriodEnd,
            }
          : null,
      ),
    );
    if (other.profile.incognito && theirFeatures.has("incognito")) continue;
    if (other.profile.hideFromDiscovery && theirFeatures.has("hideFromDiscovery")) continue;

    // Respect the candidate's visibility preference.
    if (other.profile.visibility === "MATCHES_ONLY") continue; // not discoverable
    if (other.profile.visibility === "VERIFIED_ONLY" && !myVerified) continue;

    // Viewer-selected Discover filters.
    if (filters.verifiedOnly && other.verification === "UNVERIFIED") continue;
    if (filters.experience && other.profile.experienceLevel !== filters.experience) continue;
    if (filters.intention && !parseTags(other.profile.intentions).includes(filters.intention)) continue;

    const { score, reasons } = scorePair(me.profile, other.profile);
    if (score <= 0) continue;
    const boostedScore = boosted.has(other.id) ? score + BOOST_SCORE_BONUS : score;

    candidates.push({
      userId: other.id,
      displayName: other.profile.displayName,
      age: other.profile.age,
      ageLabel: formatAge(other.profile.age, other.profile.ageDisplay),
      location: other.profile.location,
      experienceLevel: other.profile.experienceLevel,
      verification: other.verification,
      interests: parseTags(other.profile.interests),
      intentions: parseTags(other.profile.intentions),
      values: parseTags(other.profile.values),
      score: boostedScore,
      reason: reasons[0],
      reasons,
      fit: fitBand(score),
      photoBlurred: other.profile.photoBlurUntilMatch,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

// Canonical ordering for the unique (userAId, userBId) pair on Match.
export function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** The other participant in a match, relative to `meId`. */
export function otherUserId(match: { userAId: string; userBId: string }, meId: string): string {
  return match.userAId === meId ? match.userBId : match.userAId;
}

/**
 * Records a like. If the other user already liked back, creates a Match and
 * returns it (mutual interest). Messaging is unlocked only when a Match exists.
 */
export async function like(fromUserId: string, toUserId: string, superLike = false) {
  if (fromUserId === toUserId) throw new Error("cannot like self");

  await prisma.like.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId, superLike },
    update: superLike ? { superLike: true } : {},
  });

  const reciprocal = await prisma.like.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
  });

  if (!reciprocal) return { matched: false as const };

  const [userAId, userBId] = orderPair(fromUserId, toUserId);
  // 48-hour soft intro window (#48) — lapses if neither writes, but is extendable.
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId, expiresAt },
    update: {},
  });
  return { matched: true as const, matchId: match.id };
}
