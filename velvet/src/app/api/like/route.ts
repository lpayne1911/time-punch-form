import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { like } from "@/lib/matching";
import { likesRemainingToday } from "@/lib/entitlements";
import { FREE_DAILY_LIKE_LIMIT } from "@/lib/billing";

const schema = z.object({ toUserId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { toUserId } = parsed.data;

  // Cannot interact with users you've blocked or who blocked you.
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: toUserId },
        { blockerId: toUserId, blockedId: user.id },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: "Unavailable." }, { status: 403 });

  // Free-tier daily like cap (blueprint §22/§29). A soft conversion lever — never
  // applied to safety actions, which are always free.
  const remaining = await likesRemainingToday(user.id);
  if (remaining !== "unlimited" && remaining <= 0) {
    return NextResponse.json(
      {
        error: "limit_reached",
        message: `You've reached today's ${FREE_DAILY_LIKE_LIMIT} likes. Upgrade to Plus for unlimited likes, or come back tomorrow.`,
        upgrade: "PLUS",
      },
      { status: 402 },
    );
  }

  const result = await like(user.id, toUserId);
  return NextResponse.json(result);
}
