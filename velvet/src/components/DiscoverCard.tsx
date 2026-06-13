"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/lib/matching";

export default function DiscoverCard({ candidate }: { candidate: Candidate }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | "liked" | "passed">(null);
  const [matched, setMatched] = useState<string | null>(null);

  async function like() {
    setBusy(true);
    const res = await fetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: candidate.userId }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.matched) {
      setMatched(data.matchId);
    } else {
      setDone("liked");
    }
  }

  if (matched) {
    return (
      <div className="card notice ok sans">
        <strong>It's mutual!</strong> You and {candidate.displayName} have both expressed interest.
        <div style={{ marginTop: 10 }}>
          <button className="btn small" onClick={() => router.push(`/messages/${matched}`)}>
            Say hello
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card muted sans small">
        {done === "liked" ? `Interest sent to ${candidate.displayName}.` : "Passed."}
      </div>
    );
  }

  const verified = candidate.verification !== "UNVERIFIED";

  return (
    <div className="card">
      <div className="blur-photo">Photo blurred until mutual interest</div>
      <div className="between" style={{ marginTop: 12 }}>
        <h2 style={{ margin: 0 }}>
          {candidate.displayName}, {candidate.age}
        </h2>
        {verified && <span className="badge sans">✓ Verified</span>}
      </div>
      <p className="muted small sans" style={{ margin: "2px 0 8px" }}>
        {candidate.location}
        {candidate.experienceLevel ? ` · ${candidate.experienceLevel}` : ""}
      </p>

      <div className="notice sans small" style={{ margin: "8px 0" }}>
        {candidate.reason}
      </div>

      <div className="pill-list" style={{ marginTop: 6 }}>
        {candidate.interests.slice(0, 4).map((t) => (
          <span key={t} className="tag readonly sans">{t}</span>
        ))}
      </div>

      <div className="row sans" style={{ marginTop: 14 }}>
        <button className="btn" onClick={like} disabled={busy}>
          {busy ? "…" : "Express interest"}
        </button>
        <button className="btn ghost" onClick={() => setDone("passed")} disabled={busy}>
          Pass
        </button>
      </div>
    </div>
  );
}
