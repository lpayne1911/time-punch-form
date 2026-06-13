import { redirect } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { getEntitlements } from "@/lib/entitlements";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { requestJoin, leaveCircle } from "../actions";

export const dynamic = "force-dynamic";

export default async function CircleDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOnboarded();
  const ent = await getEntitlements(user.id);
  if (!ent.has("privateCircles")) redirect("/premium?feature=privateCircles");

  const { id } = await params;
  const circle = await prisma.circle.findUnique({
    where: { id },
    include: { _count: { select: { memberships: { where: { status: "APPROVED" } } } } },
  });
  if (!circle || circle.status !== "APPROVED") redirect("/circles");

  const myMembership = await prisma.circleMembership.findUnique({
    where: { circleId_userId: { circleId: id, userId: user.id } },
  });
  const isMember = myMembership?.status === "APPROVED";
  const isPending = myMembership?.status === "PENDING";

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 620 }}>
        <div className="between">
          <h1 style={{ margin: 0 }}>{circle.name}</h1>
          <span className="badge">{circle.topic}</span>
        </div>

        <div className="card sans">
          <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{circle.description}</p>
          <p className="muted small" style={{ marginTop: 12 }}>
            {circle._count.memberships} members · Member identities are private to the circle.
          </p>
        </div>

        <div className="card sans">
          {isMember ? (
            <>
              <div className="notice ok small">You're a member of this circle.</div>
              <form action={leaveCircle.bind(null, circle.id)}>
                <button className="btn ghost small">Leave circle</button>
              </form>
            </>
          ) : isPending ? (
            <div className="notice warn small">Your request to join is pending approval.</div>
          ) : (
            <form action={requestJoin.bind(null, circle.id)}>
              <p className="muted small" style={{ marginTop: 0 }}>Joining is by approval. Be respectful — the same community standards apply.</p>
              <button className="btn small">Request to join</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
