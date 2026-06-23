import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import PhotoManager from "@/components/PhotoManager";
import { parseTags } from "@/lib/tags";
import { isStaff } from "@/lib/admin";
import { profileStrength } from "@/lib/profile";

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

function PromptRow({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <label>{label}</label>
      <p style={{ margin: "2px 0 0" }}>{text}</p>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return <p className="small" style={{ margin: "2px 0" }}><span className="muted">{label}:</span> {value}</p>;
}

export default async function MyProfile() {
  const user = await requireOnboarded();
  const p = user.profile!;
  const photos = await prisma.photo.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, visibility: true },
  });
  const strength = profileStrength(p);

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="between">
          <h1>Your profile</h1>
          <Link href="/onboarding/profile" className="btn ghost small sans">Edit</Link>
        </div>

        {/* Profile strength (#30) */}
        <div className="card sans">
          <div className="between">
            <strong>Profile strength</strong>
            <span className="muted small">{strength.pct}%</span>
          </div>
          <div className="meter-track" aria-hidden style={{ margin: "8px 0" }}>
            <div className="meter-fill" style={{ width: `${strength.pct}%` }} />
          </div>
          {strength.suggestions.length > 0 ? (
            <p className="muted small" style={{ margin: 0 }}>
              {strength.pct}% complete — {strength.suggestions.join(" · ")} to get better matches.
              {" "}<Link href="/onboarding/profile">Edit profile</Link>
            </p>
          ) : (
            <p className="muted small" style={{ margin: 0 }}>Your profile is looking great.</p>
          )}
        </div>

        <PhotoManager photos={photos} />

        <div className="card">
          <div className="blur-photo">Photos blurred to others until mutual interest</div>
          <div className="between" style={{ marginTop: 12 }}>
            <h2 style={{ margin: 0 }}>{p.displayName}, {p.age}</h2>
            {user.verification !== "UNVERIFIED" && <span className="badge sans">✓ Verified</span>}
          </div>
          <p className="muted small sans">
            {p.location}{p.experienceLevel ? ` · ${p.experienceLevel}` : ""}
          </p>

          <div className="sans" style={{ marginTop: 10 }}>
            <FactRow label="Intentional" value={p.intentionIntensity} />
            <FactRow label="Availability" value={p.availability} />
            <FactRow label="Meet readiness" value={p.meetReadiness} />
          </div>

          <div className="sans" style={{ marginTop: 14 }}>
            <TagRow label="Looking for" tags={parseTags(p.intentions)} />
            <TagRow label="Hoping to find" tags={parseTags(p.lookingFor)} />
            <TagRow label="Lifestyle interests" tags={parseTags(p.interests)} />
            <TagRow label="Communication style" tags={parseTags(p.communicationStyle)} />
            <TagRow label="Boundaries" tags={parseTags(p.boundaries)} />
            <TagRow label="Dealbreakers" tags={parseTags(p.dealbreakers)} />
            <TagRow label="Values" tags={parseTags(p.values)} />

            <PromptRow label="My ideal first conversation starts with…" text={p.promptFirstConversation} />
            <PromptRow label="The connection I'm hoping for feels like…" text={p.promptIdealConnection} />
            <PromptRow label="Respectful communication, to me…" text={p.promptCommunication} />
            <PromptRow label="A boundary I respect deeply is…" text={p.promptBoundary} />
          </div>
        </div>

        {/* Account hub — the destinations not in the mobile bottom bar. */}
        <div className="card">
          <h2 style={{ marginTop: 0 }}>More</h2>
          <div className="more-links">
            <Link href="/verify">Verify your identity</Link>
            <Link href="/premium" style={{ color: "var(--gold)" }}>Membership &amp; upgrades</Link>
            <Link href="/shop">Add-ons</Link>
            <Link href="/circles">Circles</Link>
            <Link href="/safety">Safety center</Link>
            <Link href="/settings">Settings</Link>
            {isStaff(user.role) && (
              <Link href="/admin" style={{ color: "var(--gold)" }}>Moderation</Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
