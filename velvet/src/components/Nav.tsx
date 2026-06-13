import Link from "next/link";

export default function Nav() {
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
      </div>
    </div>
  );
}
