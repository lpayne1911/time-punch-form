import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function Matches() {
  const user = await requireOnboarded();

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  // Resolve the "other" user's profile for each match.
  const otherIds = matches.map((m) => (m.userAId === user.id ? m.userBId : m.userAId));
  const others = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    include: { profile: true },
  });
  const byId = new Map(others.map((o) => [o.id, o]));

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Matches</h1>
        <p className="lede">
          Mutual interest unlocks a conversation. Lead with respect — and use the safety tools any
          time.
        </p>

        {matches.length === 0 ? (
          <div className="card center muted">
            No matches yet. When you and another member both express interest, you'll be able to
            message here.
          </div>
        ) : (
          matches.map((m) => {
            const otherId = m.userAId === user.id ? m.userBId : m.userAId;
            const other = byId.get(otherId);
            const last = m.messages[0];
            return (
              <Link key={m.id} href={`/messages/${m.id}`} className="card between sans" style={{ display: "flex" }}>
                <div>
                  <strong>{other?.profile?.displayName ?? "Member"}</strong>
                  <p className="muted small" style={{ margin: "2px 0 0" }}>
                    {last ? last.body.slice(0, 60) : "Say hello"}
                  </p>
                </div>
                <span className="muted">›</span>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
