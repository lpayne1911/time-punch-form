import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CATEGORY_LABELS, formatPrice } from "@/lib/events";

/** Upcoming, approved events for the native client, with the viewer's RSVP. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const events = await prisma.event.findMany({
    where: { status: "APPROVED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: {
      host: { include: { profile: true } },
      _count: { select: { rsvps: { where: { status: "RESERVED" } } } },
      rsvps: { where: { userId: user.id }, select: { status: true } },
    },
    take: 50,
  });

  return NextResponse.json({
    isHost: user.isHost,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      category: e.category,
      categoryLabel: CATEGORY_LABELS[e.category] ?? e.category,
      format: e.format,
      location: e.format === "ONLINE" ? "Online" : e.location,
      startsAt: e.startsAt.toISOString(),
      priceLabel: formatPrice(e.priceCents),
      priceCents: e.priceCents,
      capacity: e.capacity,
      attending: e._count.rsvps,
      hostName: e.host.profile?.displayName ?? "a verified host",
      myRsvp: e.rsvps[0]?.status ?? null,
    })),
  });
}
