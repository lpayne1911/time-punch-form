import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { like } from "@/lib/matching";
import { useSuperLike, refundSuperLike } from "@/lib/purchases";
import { rateLimit } from "@/lib/ratelimit";
import { blockExistsBetween, findDiscoverableMember } from "@/lib/relations";

const schema = z.object({ toUserId: z.string().min(1) });

// A "thoughtful intro" (super-like). Consumes one credit, surfaces the sender
// higher on the recipient's Likes — but connection STILL requires mutual
// interest. It does not buy access to a person (blueprint §25, §34).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!rateLimit(`superlike:${user.id}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Slow down a moment." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { toUserId } = parsed.data;

  if (toUserId === user.id) {
    return NextResponse.json({ error: "You can't intro yourself." }, { status: 400 });
  }

  // Validate the target is a real, discoverable member BEFORE spending a credit,
  // so a bad target can never burn a paid intro (audit #6).
  if (!(await findDiscoverableMember(toUserId))) {
    return NextResponse.json({ error: "Member unavailable." }, { status: 404 });
  }
  if (await blockExistsBetween(user.id, toUserId)) {
    return NextResponse.json({ error: "Unavailable." }, { status: 403 });
  }

  const ok = await useSuperLike(user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "no_credits", message: "You're out of thoughtful intros.", shop: "SUPER_LIKE" },
      { status: 402 },
    );
  }

  // Refund the credit if the like fails for any reason, so it's never lost.
  try {
    const result = await like(user.id, toUserId, true);
    return NextResponse.json({ ...result, superLike: true });
  } catch {
    await refundSuperLike(user.id);
    return NextResponse.json({ error: "Couldn't send your intro. Your credit was not used." }, { status: 500 });
  }
}
