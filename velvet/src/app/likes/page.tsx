import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { getEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import DiscoverCard from "@/components/DiscoverCard";
import { parseTags } from "@/lib/tags";
import { formatAge } from "@/lib/profile";
import type { Candidate } from "@/lib/matching";

export const dynamic = "force-dynamic";

export default async function Likes() {
  const user = await requireOnboarded();
  const ent = await getEntitlements(user.id);

  // People who liked me, that I haven't liked back, excluding blocks.
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] },
  });
  const blockedIds = new Set(blocks.map((b) => (b.blockerId === user.id ? b.blockedId : b.blockerId)));
  const myLikes = await prisma.like.findMany({ where: { fromUserId: user.id }, select: { toUserId: true } });
  const likedBack = new Set(myLikes.map((l) => l.toUserId));

  const incoming = await prisma.like.findMany({
    where: { toUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      from: {
        include: {
          profile: true,
          photos: {
            where: { status: "APPROVED", visibility: "PUBLIC" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  });
  const pending = incoming
    .filter((l) => !blockedIds.has(l.fromUserId) && !likedBack.has(l.fromUserId) && l.from.profile?.completed)
    // Thoughtful intros (super-likes) surface first (blueprint §25).
    .sort((a, b) => Number(b.superLike) - Number(a.superLike));

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Who likes you</h1>

        {!ent.has("seeWhoLikedYou") ? (
          <div className="card center sans">
            <div style={{ fontSize: "2.4rem", fontWeight: 700, color: "var(--accent)" }}>
              {pending.length}
            </div>
            <p className="lede">
              {pending.length === 1 ? "Someone has" : `${pending.length} people have`} expressed
              interest in you.
            </p>
            <p className="muted">
              Upgrade to Plus to see who they are and connect instantly.
            </p>
            <Link href="/premium?feature=seeWhoLikedYou" className="btn">See who likes you</Link>
          </div>
        ) : pending.length === 0 ? (
          <div className="card center muted">No new interest yet. Keep exploring on Discover.</div>
        ) : (
          <>
            <p className="lede">These members have already expressed interest. Like back to match.</p>
            {pending.map((l) => {
              const p = l.from.profile!;
              const candidate: Candidate = {
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
                score: 0,
                reason: l.superLike ? "⭐ Sent you a thoughtful intro." : "Already expressed interest in you.",
                reasons: [l.superLike ? "⭐ Sent you a thoughtful intro" : "Already expressed interest in you"],
                fit: "Some overlap",
                photoBlurred: true,
                photoId: l.from.photos[0]?.id ?? null,
              };
              return <DiscoverCard key={l.id} candidate={candidate} />;
            })}
          </>
        )}
      </div>
    </>
  );
}
