import { prisma } from "@/lib/db";
import { warnUser, suspendUser, banUser, reinstateUser } from "../actions";

export const dynamic = "force-dynamic";

function statusBadge(status: string, suspendedUntil: Date | null) {
  if (status === "ACTIVE") return <span className="badge sans" style={{ color: "var(--ok)", borderColor: "var(--ok)" }}>active</span>;
  if (status === "SUSPENDED")
    return (
      <span className="badge sans" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
        {suspendedUntil ? `suspended → ${new Date(suspendedUntil).toLocaleDateString()}` : "banned"}
      </span>
    );
  return <span className="badge sans">{status.toLowerCase()}</span>;
}

export default async function Users({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      ...(q
        ? { OR: [{ email: { contains: q } }, { profile: { is: { displayName: { contains: q } } } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      profile: true,
      _count: { select: { reportsAgainst: true } },
    },
  });

  return (
    <>
      <h1>Members</h1>
      <form className="row sans" style={{ marginBottom: 8 }}>
        <input name="q" defaultValue={q ?? ""} placeholder="Search by name or email" style={{ flex: 1, margin: 0 }} />
        <button className="btn small">Search</button>
      </form>

      {users.map((u) => (
        <div key={u.id} className="card sans">
          <div className="between">
            <div>
              <strong>{u.profile?.displayName ?? "(no profile)"}</strong>{" "}
              <span className="muted small">{u.email}</span>
            </div>
            {statusBadge(u.status, u.suspendedUntil)}
          </div>
          <p className="muted small" style={{ margin: "4px 0" }}>
            {u.role} · {u.verification} · warnings: {u.warningCount} · reports against: {u._count.reportsAgainst}
            {u.profile?.location ? ` · ${u.profile.location}` : ""}
          </p>

          <div className="row" style={{ marginTop: 6, alignItems: "flex-end", flexWrap: "wrap" }}>
            <form action={warnUser} className="row" style={{ gap: 6 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input name="reason" placeholder="reason" style={{ margin: 0, width: 150 }} />
              <button className="btn ghost small">Warn</button>
            </form>
            <form action={suspendUser} className="row" style={{ gap: 6 }}>
              <input type="hidden" name="userId" value={u.id} />
              <input name="days" type="number" defaultValue={7} style={{ margin: 0, width: 64 }} />
              <button className="btn ghost small">Suspend</button>
            </form>
            {u.status === "SUSPENDED" ? (
              <form action={reinstateUser}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="btn small">Reinstate</button>
              </form>
            ) : (
              <form action={banUser}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="btn danger small">Ban</button>
              </form>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
