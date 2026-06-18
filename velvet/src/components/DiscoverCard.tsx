"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/lib/matching";

const FIT_CLASS: Record<string, string> = {
  "Strong fit": "fit-strong",
  "Some overlap": "fit-some",
  "Different pace": "fit-diff",
};

export default function DiscoverCard({
  candidate,
  highlight = false,
}: {
  candidate: Candidate;
  highlight?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "liked" | "passed">(null);
  const [matched, setMatched] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);

  async function like() {
    setBusy(true);
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: candidate.userId }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 402) {
      setLimit(data.message ?? "Daily like limit reached.");
      return;
    }
    if (data.matched) {
      setMatched(data.matchId);
    } else {
      setDone("liked");
    }
  }

  async function superLike() {
    setBusy(true);
    const res = await fetch("/api/superlike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: candidate.userId }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 402) {
      setLimit("You're out of thoughtful intros. Pick some up in Add-ons.");
      return;
    }
    if (data.matched) setMatched(data.matchId);
    else setDone("liked");
  }

  if (limit) {
    return (
      <div className="card notice">
        {limit}
        <div style={{ marginTop: 10 }}>
          <Link href="/premium?feature=unlimitedLikes" className="btn small">Upgrade to Plus</Link>
        </div>
      </div>
    );
  }

  if (matched) {
    return (
      <div className="card notice ok">
        <strong>It&apos;s mutual!</strong> You and {candidate.displayName} have both expressed interest.
        <div style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => router.push(`/messages/${matched}`)}>
            Say hello
          </button>
        </div>
      </div>
    );
  }

  if (done === "liked") {
    return <div className="card muted small">Interest sent to {candidate.displayName}.</div>;
  }

  if (done === "passed") {
    return (
      <div className="card muted small between">
        <span>Passed on {candidate.displayName}.</span>
        <button className="btn ghost small" onClick={() => setDone(null)}>Undo</button>
      </div>
    );
  }

  const verified = candidate.verification !== "UNVERIFIED";

  return (
    <div className={`card discover-card${highlight ? " pick" : ""}`}>
      <div className="blur-photo discover-photo">Photo blurred until mutual interest</div>

      <div className="between" style={{ marginTop: 14 }}>
        <h2 style={{ margin: 0 }}>
          {candidate.displayName}, {candidate.age}
        </h2>
        {verified && <span className="badge">✓ Verified</span>}
      </div>

      <div className="row" style={{ margin: "4px 0 2px", gap: 8 }}>
        <span className={`fit ${FIT_CLASS[candidate.fit] ?? ""}`}>{candidate.fit}</span>
        <span className="muted small">
          {candidate.location}
          {candidate.experienceLevel ? ` · ${candidate.experienceLevel}` : ""}
        </span>
      </div>

      {/* Why we matched — up to three concrete, warm reasons. */}
      <ul className="why">
        {candidate.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>

      <div className="pill-list" style={{ marginTop: 6 }}>
        {candidate.interests.slice(0, 4).map((t) => (
          <span key={t} className="tag readonly">{t}</span>
        ))}
      </div>

      <div className="card-actions">
        <button className="btn ghost pass" onClick={() => setDone("passed")} disabled={busy}>
          Pass
        </button>
        <button className="btn block" onClick={like} disabled={busy}>
          {busy ? "…" : "♥ Like"}
        </button>
        <button className="btn ghost intro" onClick={superLike} disabled={busy} title="Send a thoughtful intro">
          ⭐ Intro
        </button>
      </div>
    </div>
  );
}
