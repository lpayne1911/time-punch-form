import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { REPORT_CATEGORIES } from "@/lib/safety";
import { rateLimit } from "@/lib/ratelimit";

const categories = REPORT_CATEGORIES.map((c) => c.value) as [string, ...string[]];
const schema = z.object({
  reportedId: z.string().min(1),
  category: z.enum(categories),
  detail: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!rateLimit(`report:${user.id}`, 20, 60 * 60_000).ok) {
    return NextResponse.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  if (parsed.data.reportedId === user.id) {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  // Validate the reported user exists (avoid orphan reports).
  const target = await prisma.user.findUnique({ where: { id: parsed.data.reportedId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Member not found." }, { status: 404 });

  await prisma.report.create({
    data: {
      reporterId: user.id,
      reportedId: parsed.data.reportedId,
      category: parsed.data.category,
      detail: parsed.data.detail ?? null,
    },
  });
  // Report lands in the moderation queue (status OPEN) for human review.
  return NextResponse.json({ ok: true });
}
