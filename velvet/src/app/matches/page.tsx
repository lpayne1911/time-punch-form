import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { otherUserId } from "@/lib/matching";
import Nav from "@/components/Nav";

export const dynamic = "force-dynamic";

const DAY = 86_400_000;

type Row = {
  id: string;
  name: string;
  preview: string;
  quietDays: number | null;
};

function Section({ title, rows, hint }: { title: string; rows: Row[]; hint?: string }) {
  if (rows.length === 0) return null;
  return (
    <>
      <h2>{title} <span className="muted small">({rows.length})</span></h2>
      {hint && <p className="muted small" style={{ marginTop: -6 }}>{hint}</p>}
      {rows.map((r) => (
        <Link key={r.id} href={`/messages/${r.id}`} className="card between sans" style={{ display: "flex" }}>
          <div>
            <strong>{r.name}</strong>
            <p className="muted small" style={{ margin: "2px 0 0" }}>{r.preview}</p>
            {r.quietDays !== null && r.quietDays >= 3 && (
              <p className="small" style={{ margin: "4px 0 0", color: "var(--gold)" }}>
                Quiet for {r.quietDays} days — a thoughtful follow-up could help.
              </p>
            )}
          </div>
          <span className="muted">›</span>
        </Link>
      ))}
    </>
  );
}

export default async function Matches() {
  const user = await requireOnboarded();

  const matches = await prisma.match.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const otherIds = matches.map((m) => otherUserId(m, user.id));
  const others = await prisma.user.findMany({
    where: { id: { in: otherIds } },
    include: { profile: true },
  });
  const byId = new Map(others.map((o) => [o.id, o]));

  // Bucket each match: New (no messages), Your turn (they spoke last),
  // Waiting on them (you spoke last). (#41)
  const fresh: Row[] = [];
  const yourTurn: Row[] = [];
  const waiting: Row[] = [];

  for (const m of matches) {
    const otherId = otherUserId(m, user.id);
    const other = byId.get(otherId);
    const last = m.messages[0];
    const row: Row = {
      id: m.id,
      name: other?.profile?.displayName ?? "Member",
      preview: last ? last.body.slice(0, 60) : "Say hello",
      quietDays: last ? Math.floor((Date.now() - last.createdAt.getTime()) / DAY) : null,
    };
    if (!last) fresh.push(row);
    else if (last.senderId === user.id) waiting.push(row);
    else yourTurn.push(row);
  }

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
          <>
            <Section title="New" rows={fresh} hint="You matched — start the conversation." />
            <Section title="Your turn" rows={yourTurn} hint="They're waiting to hear back." />
            <Section title="Waiting on them" rows={waiting} />
          </>
        )}
      </div>
    </>
  );
}
