import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  eventId: z.string().min(1),
  action: z.enum(["rsvp", "cancel"]),
});

/**
 * Reserve or cancel a spot. Mirrors the web server action: capacity-aware
 * (overflow goes to WAITLIST), and canceling promotes the earliest waitlister.
 * (A paid event would settle through the store/processor first — out of scope
 * for this endpoint, which records free reservations directly.)
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { eventId, action } = parsed.data;

  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { rsvps: true } });
  if (!event || event.status !== "APPROVED") {
    return NextResponse.json({ error: "Event unavailable." }, { status: 404 });
  }

  if (action === "cancel") {
    await prisma.rsvp.updateMany({
      where: { eventId, userId: user.id },
      data: { status: "CANCELED" },
    });
    const waiter = await prisma.rsvp.findFirst({
      where: { eventId, status: "WAITLIST" },
      orderBy: { createdAt: "asc" },
    });
    if (waiter) await prisma.rsvp.update({ where: { id: waiter.id }, data: { status: "RESERVED" } });
    return NextResponse.json({ ok: true, status: "CANCELED" });
  }

  const reserved = event.rsvps.filter((r) => r.status === "RESERVED").length;
  const status = reserved < event.capacity ? "RESERVED" : "WAITLIST";
  await prisma.rsvp.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, status },
    update: { status },
  });
  return NextResponse.json({ ok: true, status });
}
