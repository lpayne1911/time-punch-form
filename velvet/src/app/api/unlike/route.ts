import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { orderPair } from "@/lib/matching";

const schema = z.object({ toUserId: z.string().min(1) });

// Undo a like/intro (powers the premium "rewind" on Discover). Removes my like
// and any match it created — messages cascade-delete with the match, which is
// safe immediately after swiping (no conversation has started yet).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { toUserId } = parsed.data;

  await prisma.like.deleteMany({ where: { fromUserId: user.id, toUserId } });
  const [userAId, userBId] = orderPair(user.id, toUserId);
  await prisma.match.deleteMany({ where: { userAId, userBId } });

  return NextResponse.json({ ok: true });
}
