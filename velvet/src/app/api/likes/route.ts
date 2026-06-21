import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { parseTags } from "@/lib/tags";
import { formatAge } from "@/lib/profile";

/**
 * "Who likes you" for the native client. Mirrors the web /likes page: members
 * who liked you, that you haven't liked back, excluding blocks. The identities
 * are only returned when the viewer holds the `seeWhoLikedYou` entitlement —
 * otherwise just the count, to drive the upgrade prompt (blueprint §22/§29).
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const ent = await getEntitlements(user.id);

  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
  });
  const blockedIds = new Set(
    blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId)),
  );
  const myLikes = await prisma.like.findMany({
    where: { fromUserId: user.id },
    select: { toUserId: true },
  });
  const likedBack = new Set(myLikes.map((l) => l.toUserId));

  const incoming = await prisma.like.findMany({
    where: { toUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { from: { include: { profile: true } } },
  });
  const pending = incoming
    .filter(
      (l) => !blockedIds.has(l.fromUserId) && !likedBack.has(l.fromUserId) && l.from.profile?.completed,
    )
    .sort((a, b) => Number(b.superLike) - Number(a.superLike));

  const entitled = ent.has("seeWhoLikedYou");

  return NextResponse.json({
    entitled,
    count: pending.length,
    likes: entitled
      ? pending.map((l) => {
          const p = l.from.profile!;
          return {
            userId: l.fromUserId,
            displayName: p.displayName,
            age: p.age,
            ageLabel: formatAge(p.age, p.ageDisplay),
            location: p.location,
            experienceLevel: p.experienceLevel,
            verification: l.from.verification,
            interests: parseTags(p.interests),
            intentions: parseTags(p.intentions),
            values: parseTags(p.values),
            superLike: l.superLike,
            reason: l.superLike
              ? "Sent you a thoughtful intro."
              : "Already expressed interest in you.",
          };
        })
      : [],
  });
}
