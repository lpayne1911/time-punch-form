import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { like } from "@/lib/matching";
import { likesRemainingToday } from "@/lib/entitlements";
import { FREE_DAILY_LIKE_LIMIT } from "@/lib/billing";
import { rateLimit } from "@/lib/ratelimit";
import { blockExistsBetween, findDiscoverableMember } from "@/lib/relations";

const schema = z.object({ toUserId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!rateLimit(`like:${user.id}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { toUserId } = parsed.data;

  if (toUserId === user.id) {
    return NextResponse.json({ error: "You can't like yourself." }, { status: 400 });
  }

  if (!(await findDiscoverableMember(toUserId))) {
    return NextResponse.json({ error: "Member unavailable." }, { status: 404 });
  }
  if (await blockExistsBetween(user.id, toUserId)) {
    return NextResponse.json({ error: "Unavailable." }, { status: 403 });
  }

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
