import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({ blockedId: z.string().min(1) });

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  if (parsed.data.blockedId === user.id) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  // Only allow blocking a real user (avoid orphan block rows).
  const target = await prisma.user.findUnique({ where: { id: parsed.data.blockedId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.blockedId } },
    create: { blockerId: user.id, blockedId: parsed.data.blockedId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  await prisma.block.deleteMany({
    where: { blockerId: user.id, blockedId: parsed.data.blockedId },
  });
  return NextResponse.json({ ok: true });
}
