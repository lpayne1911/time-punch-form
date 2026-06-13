import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/admin";

export default async function Nav() {
  const user = await getCurrentUser();
  const staff = isStaff(user?.role);

  return (
    <div className="nav">
      <div className="nav-inner">
        <Link href="/discover" className="brand" style={{ fontSize: "1rem" }}>
          VELVET<span className="dot">.</span>
        </Link>
        <span className="spacer" />
        <Link href="/discover">Discover</Link>
        <Link href="/matches">Matches</Link>
        <Link href="/profile">Profile</Link>
        <Link href="/safety">Safety</Link>
        <Link href="/settings">Settings</Link>
        {staff && (
          <Link href="/admin" style={{ color: "var(--gold)" }}>
            Mod
          </Link>
        )}
      </div>
    </div>
  );
}
