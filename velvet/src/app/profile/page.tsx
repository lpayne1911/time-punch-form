import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import { parseTags } from "@/lib/tags";

export const dynamic = "force-dynamic";

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  if (tags.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <label>{label}</label>
      <div className="pill-list" style={{ marginTop: 4 }}>
        {tags.map((t) => (
          <span key={t} className="tag readonly sans">{t}</span>
        ))}
      </div>
    </div>
  );
}

export default async function MyProfile() {
  const user = await requireOnboarded();
  const p = user.profile!;

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="between">
          <h1>Your profile</h1>
          <Link href="/onboarding/profile" className="btn ghost small sans">Edit</Link>
        </div>

        <div className="card">
          <div className="blur-photo">Photos blurred to others until mutual interest</div>
          <div className="between" style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>{p.displayName}, {p.age}</h2>
            {user.verification !== "UNVERIFIED" && <span className="badge sans">✓ Verified</span>}
          </div>
          <p className="muted small sans">
            {p.location}{p.experienceLevel ? ` · ${p.experienceLevel}` : ""}
          </p>

          <div className="sans" style={{ marginTop: 14 }}>
            <TagRow label="Looking for" tags={parseTags(p.intentions)} />
            <TagRow label="Lifestyle interests" tags={parseTags(p.interests)} />
            <TagRow label="Communication style" tags={parseTags(p.communicationStyle)} />
            <TagRow label="Boundaries" tags={parseTags(p.boundaries)} />
            <TagRow label="Hoping to find" tags={parseTags(p.lookingFor)} />
            <TagRow label="Values" tags={parseTags(p.values)} />

            {p.promptCommunication && (
              <div style={{ marginTop: 10 }}>
                <label>Respectful communication, to me…</label>
                <p style={{ margin: "2px 0 0" }}>{p.promptCommunication}</p>
              </div>
            )}
            {p.promptBoundary && (
              <div style={{ marginTop: 10 }}>
                <label>A boundary I always honor…</label>
                <p style={{ margin: "2px 0 0" }}>{p.promptBoundary}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
