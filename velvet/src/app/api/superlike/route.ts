import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { like } from "@/lib/matching";
import { useSuperLike } from "@/lib/purchases";

const schema = z.object({ toUserId: z.string().min(1) });

// A "thoughtful intro" (super-like). Consumes one credit, surfaces the sender
// higher on the recipient's Likes — but connection STILL requires mutual
// interest. It does not buy access to a person (blueprint §25, §34).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { toUserId } = parsed.data;

  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user.id, blockedId: toUserId },
        { blockerId: toUserId, blockedId: user.id },
      ],
    },
  });
  if (blocked) return NextResponse.json({ error: "Unavailable." }, { status: 403 });

  const ok = await useSuperLike(user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "no_credits", message: "You're out of thoughtful intros.", shop: "SUPER_LIKE" },
      { status: 402 },
    );
  }

  const result = await like(user.id, toUserId, true);
  return NextResponse.json({ ...result, superLike: true });
}
