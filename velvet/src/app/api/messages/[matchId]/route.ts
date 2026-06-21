import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { otherUserId } from "@/lib/matching";
import { getEntitlements } from "@/lib/entitlements";
import { parseTags } from "@/lib/tags";

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

/** Full conversation for the native thread screen. Mirrors the web message page. */
export async function GET(_req: Request, ctx: { params: Promise<{ matchId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { matchId } = await ctx.params;
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  const isA = match.userAId === user.id;
  const otherId = otherUserId(match, user.id);
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
  // moderator clears them; the sender still sees their own.
  const messages = await prisma.message.findMany({
    where: { matchId, OR: [{ quarantined: false }, { senderId: user.id }] },
    orderBy: { createdAt: "asc" },
  });

  const blocked = await prisma.block.findFirst({
    where: { blockerId: user.id, blockedId: otherId },
  });
  const ent = await getEntitlements(user.id);

  return NextResponse.json({
    matchId,
    otherId,
    otherName: other?.profile?.displayName ?? "Member",
    starters: buildStarters(me?.profile ?? null, other?.profile ?? null),
    canSeeReceipts: ent.has("readReceipts"),
    reveal: {
      mine: isA ? match.revealA : match.revealB,
      theirs: isA ? match.revealB : match.revealA,
      both: match.revealA && match.revealB,
    },
    paused: match.pausedAt ? { byMe: match.pausedById === user.id } : null,
    expiresAt: match.expiresAt ? match.expiresAt.toISOString() : null,
    alreadyBlocked: !!blocked,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      senderId: m.senderId,
      mine: m.senderId === user.id,
      flagged: m.flagged,
      quarantined: m.quarantined,
      readAt: m.readAt ? m.readAt.toISOString() : null,
    })),
  });
}
