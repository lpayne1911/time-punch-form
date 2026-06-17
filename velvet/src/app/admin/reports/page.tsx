import Link from "next/link";
import { prisma } from "@/lib/db";
import { REPORT_CATEGORIES } from "@/lib/safety";
import { resolveReport } from "../actions";

export const dynamic = "force-dynamic";

const LABELS = Object.fromEntries(REPORT_CATEGORIES.map((c) => [c.value, c.label]));
// Urgent categories are surfaced first (blueprint §17 SLAs).
const URGENT = new Set(["MINOR_SAFETY", "THREAT"]);

export default async function ReportsQueue() {
  const reports = await prisma.report.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "asc" },
    include: {
      reported: { include: { profile: true } },
      reporter: { select: { email: true } },
    },
  });

  reports.sort((a, b) => Number(URGENT.has(b.category)) - Number(URGENT.has(a.category)));

  return (
    <>
      <h1>Report Queue</h1>
      <p className="lede">Open reports, urgent categories first. Resolve each with a decision and note.</p>

      {reports.length === 0 ? (
        <div className="card center muted">No open reports. 🎉</div>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="card sans" style={{ borderColor: URGENT.has(r.category) ? "var(--danger)" : undefined }}>
            <div className="between">
              <strong>{LABELS[r.category] ?? r.category}</strong>
              {URGENT.has(r.category) && <span className="badge" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>URGENT</span>}
            </div>
            <p className="muted small" style={{ margin: "4px 0" }}>
              Reported member:{" "}
              <Link href={`/admin/users?q=${encodeURIComponent(r.reported.email)}`}>
                {r.reported.profile?.displayName ?? r.reported.email}
              </Link>{" "}
              · by {r.reporter.email} · {new Date(r.createdAt).toLocaleString()}
            </p>
            {r.detail && <p className="small">"{r.detail}"</p>}

            <form action={resolveReport} className="row" style={{ marginTop: 8, alignItems: "flex-end" }}>
              <input type="hidden" name="reportId" value={r.id} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <label>Resolution note</label>
                <input name="resolution" placeholder="What action was taken / why dismissed" style={{ margin: "4px 0 0" }} />
              </div>
              <button name="decision" value="ACTIONED" className="btn small">Action &amp; close</button>
              <button name="decision" value="DISMISSED" className="btn ghost small">Dismiss</button>
            </form>
            <p className="muted small" style={{ marginTop: 6 }}>
              Enforce against this member from{" "}
              <Link href={`/admin/users?q=${encodeURIComponent(r.reported.email)}`}>Users</Link> (warn / suspend / ban).
            </p>
          </div>
        ))
      )}
    </>
  );
}
