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
  const [exit, setExit] = useState<null | "left" | "right" | "up">(null);

  // Fly the card off, then settle into the result state (signature swipe motion).
  function animateThen(dir: "left" | "right" | "up", fn: () => void) {
    setExit(dir);
    setTimeout(fn, 330);
  }

  async function like() {
    setBusy(true);
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: candidate.userId }),
    });
    const data = await res.json();
    if (res.status === 402) {
      setBusy(false);
      setLimit(data.message ?? "Daily like limit reached.");
      return;
    }
    animateThen("right", () => {
      setBusy(false);
      if (data.matched) setMatched(data.matchId);
      else setDone("liked");
    });
  }

  async function superLike() {
    setBusy(true);
    const res = await fetch("/api/superlike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: candidate.userId }),
    });
    const data = await res.json();
    if (res.status === 402) {
      setBusy(false);
      setLimit("You're out of thoughtful intros. Pick some up in Add-ons.");
      return;
    }
    animateThen("up", () => {
      setBusy(false);
      if (data.matched) setMatched(data.matchId);
      else setDone("liked");
    });
  }

  function pass() {
    setBusy(true);
    animateThen("left", () => { setBusy(false); setDone("passed"); });
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
    <div className={`card discover-card${highlight ? " pick" : ""}${exit ? ` exit-${exit}` : ""}`}>
      <div className="blur-photo discover-photo">Photo blurred until mutual interest</div>

      <div className="between" style={{ marginTop: 14 }}>
        <h2 style={{ margin: 0 }}>
          {candidate.displayName}{candidate.ageLabel ? `, ${candidate.ageLabel}` : ""}
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

      <div className="swipe-actions">
        <div>
          <button className="swipe-btn pass" onClick={pass} disabled={busy} aria-label={`Pass on ${candidate.displayName}`}>
            ✕
          </button>
          <div className="swipe-label">Pass</div>
        </div>
        <div>
          <button className="swipe-btn like" onClick={like} disabled={busy} aria-label={`Like ${candidate.displayName}`}>
            {busy ? "…" : "♥"}
          </button>
          <div className="swipe-label">Like</div>
        </div>
        <div>
          <button className="swipe-btn intro" onClick={superLike} disabled={busy} aria-label={`Send a thoughtful intro to ${candidate.displayName}`}>
            ★
          </button>
          <div className="swipe-label">Intro</div>
        </div>
      </div>
    </div>
  );
}
