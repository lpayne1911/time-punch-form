import { prisma } from "./db";
import { parseTags } from "./tags";

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

export type Candidate = {
  userId: string;
  displayName: string;
  age: number;
  location: string;
  experienceLevel: string | null;
  verification: string;
  interests: string[];
  intentions: string[];
  values: string[];
  score: number;
  reason: string;
  photoBlurred: boolean;
};

function scorePair(me: ProfileLike, them: ProfileLike): { score: number; reason: string } {
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

  // Build a warm, non-objectifying reason from the strongest signal.
  let reason = "You share a thoughtful approach to connection.";
  if (sharedValues.length) reason = `You both value ${sharedValues[0].toLowerCase()}.`;
  if (sharedIntentions.length) reason = `You're both looking for: ${sharedIntentions[0].toLowerCase()}.`;
  if (sharedInterests.length) reason = `Shared interest in ${sharedInterests[0].toLowerCase()}.`;
  if (sharedBoundaries.length && sharedInterests.length)
    reason = `Shared interest in ${sharedInterests[0].toLowerCase()}, and aligned on boundaries.`;

  return { score, reason };
}

/**
 * Returns ranked, compatible candidates for a user, excluding:
 * blocked/blocking users, already-liked users, suspended/deleted accounts,
 * and incognito profiles. Respects each candidate's visibility setting.
 */
export async function getCandidates(userId: string, limit = 20): Promise<Candidate[]> {
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

  const others = await prisma.user.findMany({
    where: {
      id: { not: userId },
      status: "ACTIVE",
      deletedAt: null,
      // Respect incognito and premium "hide from discovery" (blueprint §20, §24).
      profile: { is: { completed: true, incognito: false, hideFromDiscovery: false } },
      // Premium "verified-only browsing" filter (blueprint §24).
      ...(me.profile.discoverVerifiedOnly ? { verification: { not: "UNVERIFIED" } } : {}),
    },
    include: { profile: true },
    take: 200,
  });

  const myVerified = me.verification !== "UNVERIFIED";

  const candidates: Candidate[] = [];
  for (const other of others) {
    if (!other.profile) continue;
    if (blockedIds.has(other.id) || likedIds.has(other.id)) continue;

    // Respect the candidate's visibility preference.
    if (other.profile.visibility === "MATCHES_ONLY") continue; // not discoverable
    if (other.profile.visibility === "VERIFIED_ONLY" && !myVerified) continue;

    const { score, reason } = scorePair(me.profile, other.profile);
    if (score <= 0) continue;

    candidates.push({
      userId: other.id,
      displayName: other.profile.displayName,
      age: other.profile.age,
      location: other.profile.location,
      experienceLevel: other.profile.experienceLevel,
      verification: other.verification,
      interests: parseTags(other.profile.interests),
      intentions: parseTags(other.profile.intentions),
      values: parseTags(other.profile.values),
      score,
      reason,
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

/**
 * Records a like. If the other user already liked back, creates a Match and
 * returns it (mutual interest). Messaging is unlocked only when a Match exists.
 */
export async function like(fromUserId: string, toUserId: string) {
  if (fromUserId === toUserId) throw new Error("cannot like self");

  await prisma.like.upsert({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
    create: { fromUserId, toUserId },
    update: {},
  });

  const reciprocal = await prisma.like.findUnique({
    where: { fromUserId_toUserId: { fromUserId: toUserId, toUserId: fromUserId } },
  });

  if (!reciprocal) return { matched: false as const };

  const [userAId, userBId] = orderPair(fromUserId, toUserId);
  const match = await prisma.match.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
  });
  return { matched: true as const, matchId: match.id };
}
