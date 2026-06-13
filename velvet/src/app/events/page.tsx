import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { CATEGORY_LABELS, formatPrice } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function Events() {
  const user = await requireOnboarded();

  const events = await prisma.event.findMany({
    where: { status: "APPROVED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { host: { include: { profile: true } }, _count: { select: { rsvps: true } } },
    take: 50,
  });

  const myEvents = user.isHost
    ? await prisma.event.findMany({ where: { hostId: user.id }, orderBy: { createdAt: "desc" } })
    : [];

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="between">
          <h1>Events</h1>
          {user.isHost ? (
            <Link href="/events/new" className="btn small sans">Create event</Link>
          ) : (
            <Link href="/events/host" className="btn ghost small sans">Become a host</Link>
          )}
        </div>
        <p className="lede">
          Verified-host gatherings — social mixers, consent and communication workshops, and
          community meetups. Every event is reviewed before it's listed.
        </p>

        {user.isHost && myEvents.length > 0 && (
          <div className="card sans">
            <h2 style={{ marginTop: 0 }}>Your events</h2>
            {myEvents.map((e) => (
              <div key={e.id} className="between" style={{ borderBottom: "1px solid var(--card-border)", padding: "8px 0" }}>
                <Link href={`/events/${e.id}`}>{e.title}</Link>
                <span className="badge">{e.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}

        {events.length === 0 ? (
          <div className="card center muted">No upcoming events yet. Check back soon.</div>
        ) : (
          events.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} className="card sans" style={{ display: "block" }}>
              <div className="between">
                <strong>{e.title}</strong>
                <span className="badge">{formatPrice(e.priceCents)}</span>
              </div>
              <p className="muted small" style={{ margin: "4px 0" }}>
                {CATEGORY_LABELS[e.category]} · {e.format === "ONLINE" ? "Online" : e.location} ·{" "}
                {new Date(e.startsAt).toLocaleString()}
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                Hosted by {e.host.profile?.displayName ?? "a verified host"} · {e._count.rsvps} attending
              </p>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
