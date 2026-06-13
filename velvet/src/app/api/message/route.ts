import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moderateText } from "@/lib/safety";

const schema = z.object({ matchId: z.string().min(1), body: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message can't be empty." }, { status: 400 });
  const { matchId, body } = parsed.data;

  // Messaging is gated on a real, mutual Match the user belongs to (blueprint §11).
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || (match.userAId !== user.id && match.userBId !== user.id)) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  // A block by either party closes the conversation.
  const otherId = match.userAId === user.id ? match.userBId : match.userAId;
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: otherId },
        { blockerId: otherId, blockedId: user.id },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: "This conversation is closed." }, { status: 403 });

  // Moderation: solicitation/threats flag the message for the human review queue
  // (it is still delivered but marked; off-platform contact info triggers a nudge).
  const mod = moderateText(body);

  const message = await prisma.message.create({
    data: { matchId, senderId: user.id, body, flagged: mod.flagged },
  });

  return NextResponse.json({
    ok: true,
    message: { id: message.id, body: message.body, senderId: user.id, flagged: message.flagged },
    nudgeContactInfo: mod.containsContactInfo,
  });
}
