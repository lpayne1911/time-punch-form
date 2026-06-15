import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moderateText } from "@/lib/safety";
import { rateLimit } from "@/lib/ratelimit";
import { blockExistsBetween } from "@/lib/relations";

const schema = z.object({ matchId: z.string().min(1), body: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!rateLimit(`message:${user.id}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "You're sending messages too fast." }, { status: 429 });
  }

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
  if (await blockExistsBetween(user.id, otherId)) {
    return NextResponse.json({ error: "This conversation is closed." }, { status: 403 });
  }

  // Moderation (blueprint §11, §18). High-severity content (solicitation/threats)
  // is QUARANTINED: the message is stored and queued for review but withheld from
  // the recipient until a moderator clears it. Low-severity (off-platform contact
  // info) is delivered with a safety nudge.
  const mod = moderateText(body);
  const quarantined = mod.severity === "high";

  const message = await prisma.message.create({
    data: { matchId, senderId: user.id, body, flagged: mod.flagged, quarantined },
  });

  return NextResponse.json({
    ok: true,
    message: {
      id: message.id,
      body: message.body,
      senderId: user.id,
      flagged: message.flagged,
      quarantined: message.quarantined,
    },
    nudgeContactInfo: mod.containsContactInfo,
    // Tell the sender their message is pending review (it won't reach the recipient yet).
    heldForReview: quarantined,
  });
}
