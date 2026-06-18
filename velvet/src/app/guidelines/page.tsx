import Link from "next/link";
import { COMMUNITY_STANDARDS } from "@/lib/policy";

export const metadata = { title: "Community Guidelines · Velvet" };

export default function Guidelines() {
  return (
    <div className="shell">
      <div className="between" style={{ marginTop: 8 }}>
        <Link href="/" className="brand">VELVET<span className="dot">.</span></Link>
        <Link href="/" className="small">Back</Link>
      </div>
      <h1 style={{ marginTop: 32 }}>{COMMUNITY_STANDARDS.title}</h1>
      <p className="lede">{COMMUNITY_STANDARDS.intro}</p>
      {COMMUNITY_STANDARDS.sections.map((s) => (
        <div className="card" key={s.heading}>
          <h2 style={{ marginTop: 0 }}>{s.heading}</h2>
          <p className="muted">{s.body}</p>
        </div>
      ))}
    </div>
  );
}
