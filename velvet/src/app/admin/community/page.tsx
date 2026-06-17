import { prisma } from "@/lib/db";
import { CATEGORY_LABELS, formatPrice } from "@/lib/events";
import { reviewHostApplication, reviewEvent, reviewCircle, reviewMembership } from "../actions";

export const dynamic = "force-dynamic";

export default async function CommunityQueue() {
  const [hostApps, events, circles, memberships] = await Promise.all([
    prisma.hostApplication.findMany({ where: { status: "PENDING" }, include: { user: { include: { profile: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.event.findMany({ where: { status: "PENDING" }, include: { host: { include: { profile: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.circle.findMany({ where: { status: "PENDING" }, include: { createdBy: { include: { profile: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.circleMembership.findMany({ where: { status: "PENDING" }, include: { user: { include: { profile: true } }, circle: true }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <>
      <h1>Community Review</h1>
      <p className="lede">Verify hosts, approve events and circles before they go live (blueprint §12, §26, §27).</p>

      <h2>Host applications ({hostApps.length})</h2>
      {hostApps.length === 0 ? <div className="card muted center">None pending.</div> : hostApps.map((a) => (
        <div key={a.id} className="card sans">
          <strong>{a.user.profile?.displayName ?? a.user.email}</strong>
          <p className="small" style={{ margin: "6px 0" }}>{a.bio}</p>
          {a.experience && <p className="muted small">Experience: {a.experience}</p>}
          <form action={reviewHostApplication} className="row" style={{ alignItems: "flex-end" }}>
            <input type="hidden" name="userId" value={a.userId} />
            <input name="note" placeholder="note (optional)" style={{ margin: 0, flex: 1 }} />
            <button name="decision" value="APPROVED" className="btn small">Approve host</button>
            <button name="decision" value="REJECTED" className="btn ghost small">Reject</button>
          </form>
        </div>
      ))}

      <h2>Events awaiting approval ({events.length})</h2>
      {events.length === 0 ? <div className="card muted center">None pending.</div> : events.map((e) => (
        <div key={e.id} className="card sans">
          <div className="between">
            <strong>{e.title}</strong>
            <span className="badge">{formatPrice(e.priceCents)}</span>
          </div>
          <p className="muted small" style={{ margin: "4px 0" }}>
            {CATEGORY_LABELS[e.category]} · {e.format === "ONLINE" ? "Online" : e.location} · {new Date(e.startsAt).toLocaleString()} · by {e.host.profile?.displayName ?? e.host.email}
          </p>
          <p className="small" style={{ whiteSpace: "pre-wrap" }}>{e.description}</p>
          <form action={reviewEvent} className="row" style={{ alignItems: "flex-end" }}>
            <input type="hidden" name="eventId" value={e.id} />
            <input name="note" placeholder="note (optional)" style={{ margin: 0, flex: 1 }} />
            <button name="decision" value="APPROVED" className="btn small">Approve</button>
            <button name="decision" value="REJECTED" className="btn danger small">Reject</button>
          </form>
        </div>
      ))}

      <h2>Circles awaiting approval ({circles.length})</h2>
      {circles.length === 0 ? <div className="card muted center">None pending.</div> : circles.map((c) => (
        <div key={c.id} className="card sans">
          <div className="between"><strong>{c.name}</strong><span className="badge">{c.topic}</span></div>
          <p className="small" style={{ margin: "4px 0" }}>{c.description}</p>
          <p className="muted small">by {c.createdBy.profile?.displayName ?? c.createdBy.email}</p>
          <form action={reviewCircle} className="row">
            <input type="hidden" name="circleId" value={c.id} />
            <button name="decision" value="APPROVED" className="btn small">Approve</button>
            <button name="decision" value="REJECTED" className="btn ghost small">Reject</button>
          </form>
        </div>
      ))}

      <h2>Circle join requests ({memberships.length})</h2>
      {memberships.length === 0 ? <div className="card muted center">None pending.</div> : memberships.map((m) => (
        <div key={m.id} className="card sans between">
          <span>{m.user.profile?.displayName ?? m.user.email} → <strong>{m.circle.name}</strong></span>
          <form action={reviewMembership} className="row">
            <input type="hidden" name="membershipId" value={m.id} />
            <button name="decision" value="APPROVED" className="btn small">Approve</button>
            <button name="decision" value="REMOVED" className="btn ghost small">Deny</button>
          </form>
        </div>
      ))}
    </>
  );
}
