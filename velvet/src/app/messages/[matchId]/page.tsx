import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { parseTags } from "@/lib/tags";
import Nav from "@/components/Nav";
import Thread from "@/components/Thread";

export const dynamic = "force-dynamic";

/** Up to three conversation starters from what the two members share (#42). */
function buildStarters(
  me: { interests: string; values: string; intentions: string } | null,
  them: { interests: string; values: string; intentions: string } | null,
): string[] {
  if (!me || !them) return [];
  const shared = (a: string, b: string) => {
    const setB = new Set(parseTags(b));
    return parseTags(a).filter((x) => setB.has(x));
  };
  const out: string[] = [];
  const i = shared(me.interests, them.interests);
  const v = shared(me.values, them.values);
  const n = shared(me.intentions, them.intentions);
  if (i[0]) out.push(`You both chose "${i[0]}" — what drew you to it?`);
  if (v[0]) out.push(`You both value ${v[0].toLowerCase()} — what does that look like for you?`);
  if (n[0]) out.push(`You're both here for ${n[0].toLowerCase()} — what are you hoping to find?`);
  return out.slice(0, 3);
}

export default async function MessageThread({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireOnboarded();
  const { matchId } = await params;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    redirect("/matches");
  }

  const isA = match.userAId === user.id;
  const otherId = isA ? match.userBId : match.userAId;
  const [me, other] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, include: { profile: true } }),
    prisma.user.findUnique({ where: { id: otherId }, include: { profile: true } }),
  ]);

  // Mark the other party's delivered messages as read (read receipts, #46).
  await prisma.message.updateMany({
    where: { matchId, senderId: otherId, quarantined: false, readAt: null },
    data: { readAt: new Date() },
  });

  // Quarantined (high-severity) messages are withheld from the recipient until a
  // moderator clears them; the sender still sees their own, marked pending.
  const messages = await prisma.message.findMany({
    where: { matchId, OR: [{ quarantined: false }, { senderId: user.id }] },
    orderBy: { createdAt: "asc" },
  });

  // Mutual photo reveal: only when both have opted in (#44/#45).
  const myReveal = isA ? match.revealA : match.revealB;
  const theirReveal = isA ? match.revealB : match.revealA;
  const bothRevealed = match.revealA && match.revealB;

  const otherPhoto = bothRevealed
    ? await prisma.photo.findFirst({
        where: { userId: otherId, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    : null;

  const blocked = await prisma.block.findFirst({
    where: { blockerId: user.id, blockedId: otherId },
  });

  const ent = await getEntitlements(user.id);
  const myAftercare = isA ? match.aftercareA : match.aftercareB;

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 620 }}>
        <Thread
          matchId={matchId}
          meId={user.id}
          otherId={otherId}
          otherName={other?.profile?.displayName ?? "Member"}
          otherPhotoId={otherPhoto?.id ?? null}
          starters={buildStarters(me?.profile ?? null, other?.profile ?? null)}
          canSeeReceipts={ent.has("readReceipts")}
          reveal={{ mine: myReveal, theirs: theirReveal, both: bothRevealed }}
          paused={match.pausedAt ? { byMe: match.pausedById === user.id } : null}
          expiresAt={match.expiresAt ? match.expiresAt.toISOString() : null}
          myAftercare={myAftercare}
          initialMessages={messages.map((m) => ({
            id: m.id,
            body: m.body,
            senderId: m.senderId,
            flagged: m.flagged,
            quarantined: m.quarantined,
            readAt: m.readAt ? m.readAt.toISOString() : null,
          }))}
          alreadyBlocked={!!blocked}
        />
      </div>
    </>
  );
}
