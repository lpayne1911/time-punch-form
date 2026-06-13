import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      actor: { select: { email: true } },
      target: { select: { email: true, profile: { select: { displayName: true } } } },
    },
  });

  return (
    <>
      <h1>Audit Log</h1>
      <p className="lede">
        Append-only record of every moderation action — who did what, to whom, and when (blueprint
        §17, §19, §36).
      </p>

      {logs.length === 0 ? (
        <div className="card center muted">No moderation actions yet.</div>
      ) : (
        <div className="card sans" style={{ padding: 0 }}>
          {logs.map((l) => (
            <div key={l.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--card-border)" }}>
              <span className="badge" style={{ marginRight: 8 }}>{l.action}</span>
              <span className="small">
                {l.actor.email}
                {l.target ? ` → ${l.target.profile?.displayName ?? l.target.email}` : ""}
              </span>
              <span className="muted small"> · {new Date(l.createdAt).toLocaleString()}</span>
              {l.detail && <div className="muted small">{l.detail}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
