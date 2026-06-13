import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { CATEGORY_LABELS, formatPrice, EVENT_RULES, REFUND_POLICY, PLATFORM_FEE_PCT, hostPayoutCents } from "@/lib/events";
import { rsvp, cancelRsvp, reportEvent } from "../actions";

export const dynamic = "force-dynamic";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboarded();
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: { host: { include: { profile: true } }, rsvps: true },
  });
  if (!event) redirect("/events");

  const isHost = event.hostId === user.id;
  // Only the host (or staff) can view a not-yet-approved event.
  if (event.status !== "APPROVED" && !isHost && user.role === "USER") redirect("/events");

  const reserved = event.rsvps.filter((r) => r.status === "RESERVED");
  const myRsvp = event.rsvps.find((r) => r.userId === user.id && r.status !== "CANCELED");
  const spotsLeft = Math.max(0, event.capacity - reserved.length);
  const paid = event.priceCents > 0;

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 640 }}>
        <div className="between">
          <h1 style={{ margin: 0 }}>{event.title}</h1>
          <span className="badge">{formatPrice(event.priceCents)}</span>
        </div>
        <p className="muted sans">
          {CATEGORY_LABELS[event.category]} · {event.format === "ONLINE" ? "Online" : event.location} ·{" "}
          {new Date(event.startsAt).toLocaleString()}
        </p>

        {event.status !== "APPROVED" && (
          <div className="notice warn sans small">
            This event is <strong>{event.status.toLowerCase()}</strong> and not yet publicly listed.
            {event.moderationNote ? ` Note: ${event.moderationNote}` : ""}
          </div>
        )}

        <div className="card sans">
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{event.description}</p>
          <p className="muted small" style={{ marginTop: 12 }}>
            Hosted by {event.host.profile?.displayName ?? "a verified host"} ·{" "}
            <span className="badge" style={{ fontSize: "0.65rem" }}>✓ Verified host</span>
          </p>
        </div>

        {/* Attendee privacy: only an aggregate count is shown, never a guest list (blueprint §12, §26). */}
        <div className="card sans">
          <div className="between">
            <div>
              <strong>{reserved.length} attending</strong>
              <p className="muted small" style={{ margin: 0 }}>
                {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full — you'll join the waitlist"}. Attendee
                identities are kept private.
              </p>
            </div>
            {!isHost &&
              (myRsvp ? (
                <form action={cancelRsvp.bind(null, event.id)}>
                  <button className="btn ghost small">
                    {myRsvp.status === "WAITLIST" ? "Leave waitlist" : "Cancel RSVP"}
                  </button>
                </form>
              ) : event.status === "APPROVED" ? (
                <form action={rsvp.bind(null, event.id)}>
                  <button className="btn small">{paid ? `Reserve · ${formatPrice(event.priceCents)}` : "RSVP"}</button>
                </form>
              ) : null)}
          </div>
          {paid && !myRsvp && (
            <p className="muted small" style={{ marginTop: 8 }}>
              Paid tickets are processed securely by our payments partner (a real-world ticket, not a
              digital subscription). {REFUND_POLICY}
            </p>
          )}
          {myRsvp && (
            <div className="notice ok small" style={{ marginTop: 8 }}>
              You're {myRsvp.status === "WAITLIST" ? "on the waitlist" : "reserved"}. Meet safely:
              public space, tell a friend, trust your instincts.
            </div>
          )}
        </div>

        {isHost && paid && (
          <div className="card sans">
            <h2 style={{ marginTop: 0 }}>Host payout</h2>
            <p className="muted small">
              Platform fee {PLATFORM_FEE_PCT}%. At {reserved.length} paid attendees your estimated
              payout is <strong>{formatPrice(hostPayoutCents(event.priceCents, reserved.length))}</strong>.
              You're responsible for your own taxes; we provide the required forms.
            </p>
          </div>
        )}

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Event rules</h2>
          <ul className="small stack" style={{ paddingLeft: 18 }}>
            {EVENT_RULES.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>

        {!isHost && (
          <details className="card sans">
            <summary style={{ cursor: "pointer" }}>Report this event</summary>
            <form action={reportEvent} style={{ marginTop: 10 }}>
              <input type="hidden" name="eventId" value={event.id} />
              <textarea name="detail" rows={2} placeholder="What's wrong with this event?" />
              <button className="btn ghost small">Submit report</button>
            </form>
          </details>
        )}
      </div>
    </>
  );
}
