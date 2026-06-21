import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { otherUserId } from "@/lib/matching";

const DAY = 86_400_000;

/**
 * Match list for the native client, bucketed the same way as the web /matches
 * page: "new" (no messages yet), "yourTurn" (they spoke last), "waiting" (you
 * spoke last). Each row carries a short preview and how long it's been quiet.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const otherIds = matches.map((m) => otherUserId(m, user.id));
  const others = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    include: { profile: true },
  });
  const byId = new Map(others.map((o) => [o.id, o]));

  const rows = matches.map((m) => {
    const otherId = otherUserId(m, user.id);
    const other = byId.get(otherId);
    const last = m.messages[0];
    const bucket = !last ? "new" : last.senderId === user.id ? "waiting" : "yourTurn";
    return {
      id: m.id,
      name: other?.profile?.displayName ?? "Member",
      preview: last ? last.body.slice(0, 80) : "Say hello",
      quietDays: last ? Math.floor((Date.now() - last.createdAt.getTime()) / DAY) : null,
      bucket,
      expiresAt: m.expiresAt ? m.expiresAt.toISOString() : null,
    };
  });

  return NextResponse.json({ matches: rows });
}
