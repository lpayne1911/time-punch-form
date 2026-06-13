import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { like } from "@/lib/matching";

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

  const result = await like(user.id, toUserId);
  return NextResponse.json(result);
}
