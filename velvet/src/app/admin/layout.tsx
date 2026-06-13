import Link from "next/link";
import { requireStaff } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  return (
    <>
      <div className="nav">
        <div className="nav-inner">
          <Link href="/admin" className="brand" style={{ fontSize: "1rem" }}>
            VELVET<span className="dot">.</span>{" "}
            <span className="muted" style={{ letterSpacing: 0, fontSize: "0.7rem" }}>MOD</span>
          </Link>
          <span className="spacer" />
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/reports">Reports</Link>
          <Link href="/admin/photos">Photos</Link>
          <Link href="/admin/messages">Flagged</Link>
          <Link href="/admin/community">Community</Link>
          <Link href="/admin/users">Users</Link>
          <Link href="/admin/audit">Audit</Link>
        </div>
      </div>
      <div className="shell">
        <p className="badge sans" style={{ marginTop: 8 }}>
          {staff.role} · {staff.email}
        </p>
        {children}
      </div>
    </>
  );
}
