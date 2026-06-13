import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function Stat({ label, value, href, urgent }: { label: string; value: number; href?: string; urgent?: boolean }) {
  const inner = (
    <div className="card" style={{ margin: 0, borderColor: urgent && value > 0 ? "var(--danger)" : undefined }}>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: urgent && value > 0 ? "var(--danger)" : "var(--accent)" }}>
        {value}
      </div>
      <div className="muted small sans">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboard() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [
    openReports,
    urgentReports,
    pendingPhotos,
    flaggedMessages,
    totalUsers,
    activeUsers,
    suspended,
    newThisWeek,
    totalMatches,
    pendingHosts,
    pendingEvents,
    pendingCircles,
  ] = await Promise.all([
    prisma.report.count({ where: { status: "OPEN" } }),
    prisma.report.count({ where: { status: "OPEN", category: "MINOR_SAFETY" } }),
    prisma.photo.count({ where: { status: "PENDING" } }),
    prisma.message.count({ where: { flagged: true } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { status: "ACTIVE", deletedAt: null } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
    prisma.match.count(),
    prisma.hostApplication.count({ where: { status: "PENDING" } }),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.circle.count({ where: { status: "PENDING" } }),
  ]);
  const communityPending = pendingHosts + pendingEvents + pendingCircles;

  // Simple safety north-stars (blueprint §32). Report rate = open reports per active user.
  const reportRate = activeUsers ? ((openReports / activeUsers) * 100).toFixed(1) : "0.0";

  return (
    <>
      <h1>Moderation Dashboard</h1>
      <p className="lede">Trust &amp; safety queues and community health (blueprint §32, §36).</p>

      {urgentReports > 0 && (
        <div className="notice danger sans">
          <strong>{urgentReports} urgent report(s)</strong> flagged as possible minor-safety —
          review first. <Link href="/admin/reports">Open queue ›</Link>
        </div>
      )}

      <h2>Queues</h2>
      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Stat label="Open reports" value={openReports} href="/admin/reports" urgent />
        <Stat label="Photos awaiting review" value={pendingPhotos} href="/admin/photos" />
        <Stat label="Flagged messages" value={flaggedMessages} href="/admin/messages" />
        <Stat label="Community approvals" value={communityPending} href="/admin/community" />
      </div>

      <h2>Community health</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Stat label="Members" value={totalUsers} href="/admin/users" />
        <Stat label="Active" value={activeUsers} />
        <Stat label="Suspended / banned" value={suspended} href="/admin/users" />
        <Stat label="New (7d)" value={newThisWeek} />
        <Stat label="Mutual matches" value={totalMatches} />
      </div>
      <p className="muted small sans" style={{ marginTop: 10 }}>
        Report rate: {reportRate}% of active members have an open report against them.
      </p>
    </>
  );
}
