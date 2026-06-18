import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  matchId: z.string().min(1),
  action: z.enum(["extend", "pause", "resume", "reveal", "aftercare"]),
  answer: z.enum(["respectful", "not"]).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { matchId, action, answer } = parsed.data;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }
  const isA = match.userAId === user.id;

  switch (action) {
    case "extend":
      await prisma.match.update({
        where: { id: matchId },
        data: { expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) },
      });
      break;
    case "pause":
      await prisma.match.update({
        where: { id: matchId },
        data: { pausedAt: new Date(), pausedById: user.id },
      });
      break;
    case "resume":
      await prisma.match.update({
        where: { id: matchId },
        data: { pausedAt: null, pausedById: null },
      });
      break;
    case "reveal":
      await prisma.match.update({
        where: { id: matchId },
        data: isA ? { revealA: true } : { revealB: true },
      });
      break;
    case "aftercare":
      if (!answer) return NextResponse.json({ error: "Missing answer." }, { status: 400 });
      await prisma.match.update({
        where: { id: matchId },
        data: isA ? { aftercareA: answer } : { aftercareB: answer },
      });
      break;
  }

  return NextResponse.json({ ok: true });
}
