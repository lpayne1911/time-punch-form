import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { getEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { proposeCircle } from "./actions";

export const dynamic = "force-dynamic";

export default async function Circles({
  searchParams,
}: {
  searchParams: Promise<{ proposed?: string; error?: string }>;
}) {
  const user = await requireOnboarded();
  const ent = await getEntitlements(user.id);
  const { proposed, error } = await searchParams;

  if (!ent.has("privateCircles")) {
    return (
      <>
        <Nav />
        <div className="shell">
          <h1>Private Circles</h1>
          <div className="card center sans">
            <span className="badge" style={{ marginBottom: 8 }}>Private Circle</span>
            <p className="lede">
              Small, moderated communities around shared interests — by invitation and approval.
            </p>
            <p className="muted">Private Circles are part of the Private Circle membership.</p>
            <Link href="/premium?feature=privateCircles" className="btn">View membership</Link>
          </div>
        </div>
      </>
    );
  }

  const circles = await prisma.circle.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { memberships: { where: { status: "APPROVED" } } } } },
  });

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Private Circles</h1>
        <p className="lede">Moderated, approval-gated communities. Request to join, or propose a new one.</p>

        {proposed && <div className="notice ok small sans">Your circle is under review.</div>}
        {error && <div className="notice danger small sans">Please complete all fields.</div>}

        {circles.length === 0 ? (
          <div className="card center muted">No circles yet — propose the first one below.</div>
        ) : (
          circles.map((c) => (
            <Link key={c.id} href={`/circles/${c.id}`} className="card sans" style={{ display: "block" }}>
              <div className="between">
                <strong>{c.name}</strong>
                <span className="badge">{c.topic}</span>
              </div>
              <p className="muted small" style={{ margin: "4px 0 0" }}>
                {c.description.slice(0, 100)} · {c._count.memberships} members
              </p>
            </Link>
          ))
        )}

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Propose a circle</h2>
          <p className="muted small">Circles are reviewed before they go live.</p>
          <form action={proposeCircle}>
            <label>Name</label>
            <input name="name" maxLength={80} required />
            <label>Topic</label>
            <input name="topic" maxLength={60} required placeholder="e.g. Communication & negotiation" />
            <label>Description</label>
            <textarea name="description" rows={3} maxLength={1000} required />
            <button className="btn small">Propose for review</button>
          </form>
        </div>
      </div>
    </>
  );
}
