"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/lib/matching";

const FIT_CLASS: Record<string, string> = {
  "Strong fit": "fit-strong",
  "Some overlap": "fit-some",
  "Different pace": "fit-diff",
};

const THRESH = 110; // px to commit a swipe

type Action = "like" | "pass" | "intro";

function CardFace({ c, front }: { c: Candidate; front?: boolean }) {
  return (
    <>
      <div className="deck-photo">
        <span className="deck-photo-label">Photo blurred until mutual interest</span>
      </div>
      <div className="deck-info">
        <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
          <h2 className="deck-name">
            {c.displayName}
            {c.ageLabel ? <span className="deck-age">{c.ageLabel}</span> : null}
          </h2>
          {c.verification !== "UNVERIFIED" && <span className="badge">✓ Verified</span>}
        </div>
        <div className="row" style={{ gap: 8, margin: "2px 0 8px" }}>
          <span className={`fit ${FIT_CLASS[c.fit] ?? ""}`}>{c.fit}</span>
          <span className="deck-loc">
            {c.location}{c.experienceLevel ? ` · ${c.experienceLevel}` : ""}
          </span>
        </div>
        {front && (
          <>
            <ul className="why deck-why">
              {c.reasons.slice(0, 2).map((r) => <li key={r}>{r}</li>)}
            </ul>
            <div className="pill-list" style={{ marginTop: 6 }}>
              {c.interests.slice(0, 3).map((t) => <span key={t} className="tag readonly">{t}</span>)}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function SwipeDeck({ candidates }: { candidates: Candidate[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exit, setExit] = useState<{ x: number; y: number; rot: number } | null>(null);
  const [match, setMatch] = useState<{ name: string; id: string } | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const start = useRef({ x: 0, y: 0 });

  const current = candidates[index];
  const next = candidates[index + 1];

  function advance() {
    setExit(null);
    setDrag({ x: 0, y: 0 });
    setIndex((i) => i + 1);
  }

  async function commit(action: Action) {
    if (!current || busy) return;
    const vec =
      action === "pass" ? { x: -700, y: drag.y, rot: -28 }
      : action === "intro" ? { x: drag.x, y: -800, rot: -4 }
      : { x: 700, y: drag.y, rot: 28 };

    if (action === "pass") {
      setExit(vec);
      setTimeout(advance, 300);
      return;
    }

    setBusy(true);
    const url = action === "intro" ? "/api/superlike" : "/api/like";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: current.userId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 402) {
      setDrag({ x: 0, y: 0 });
      setLimit(action === "intro"
        ? "You're out of thoughtful intros. Pick some up in Add-ons."
        : (data.message ?? "You've reached today's like limit."));
      return;
    }
    setExit(vec);
    setTimeout(() => {
      if (data.matched) setMatch({ name: current.displayName, id: data.matchId });
      advance();
    }, 300);
  }

  function onDown(e: React.PointerEvent) {
    if (busy || exit) return;
    setDragging(true);
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDrag({ x: e.clientX - start.current.x, y: e.clientY - start.current.y });
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    if (drag.y < -THRESH * 1.25 && Math.abs(drag.x) < THRESH * 1.2) commit("intro");
    else if (drag.x > THRESH) commit("like");
    else if (drag.x < -THRESH) commit("pass");
    else setDrag({ x: 0, y: 0 });
  }

  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const likeOp = clamp(drag.x / THRESH);
  const nopeOp = clamp(-drag.x / THRESH);
  const introOp = clamp(-drag.y / (THRESH * 1.25));

  const topTransform = exit
    ? `translate(${exit.x}px, ${exit.y}px) rotate(${exit.rot}deg)`
    : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 18}deg)`;
  const topTransition = dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.6,1)";

  if (!current) {
    return (
      <div className="deck-empty card center">
        <div style={{ fontSize: "2rem" }}>✦</div>
        <h2 style={{ marginTop: 8 }}>That&apos;s everyone for now</h2>
        <p className="muted">
          You&apos;ve seen today&apos;s thoughtful matches. Check back soon — Velvet grows carefully,
          and quality beats endless swiping.
        </p>
        <Link href="/matches" className="btn">See your matches</Link>
      </div>
    );
  }

  return (
    <div className="deck-wrap">
      <div className="deck">
        {next && (
          <div className="deck-card behind" aria-hidden>
            <CardFace c={next} />
          </div>
        )}
        <div
          className="deck-card front"
          style={{ transform: topTransform, transition: topTransition, touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span className="stamp like" style={{ opacity: likeOp }}>LIKE</span>
          <span className="stamp nope" style={{ opacity: nopeOp }}>NOPE</span>
          <span className="stamp intro" style={{ opacity: introOp }}>INTRO</span>
          <CardFace c={current} front />
        </div>
      </div>

      <div className="swipe-actions">
        <div>
          <button className="swipe-btn pass" onClick={() => commit("pass")} disabled={busy} aria-label="Pass">✕</button>
          <div className="swipe-label">Pass</div>
        </div>
        <div>
          <button className="swipe-btn like" onClick={() => commit("like")} disabled={busy} aria-label="Like">♥</button>
          <div className="swipe-label">Like</div>
        </div>
        <div>
          <button className="swipe-btn intro" onClick={() => commit("intro")} disabled={busy} aria-label="Send intro">★</button>
          <div className="swipe-label">Intro</div>
        </div>
      </div>

      <p className="muted small center" style={{ marginTop: 6 }}>
        Drag the card — right to like, left to pass, up for an intro.
      </p>

      {limit && (
        <div className="modal-backdrop" onClick={() => setLimit(null)}>
          <div className="modal card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>{limit}</h2>
            <p className="muted">Upgrade to Plus for unlimited likes and more daily picks.</p>
            <Link href="/premium?feature=unlimitedLikes" className="btn block">See Plus</Link>
            <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setLimit(null)}>Keep browsing</button>
          </div>
        </div>
      )}

      {match && (
        <div className="modal-backdrop" onClick={() => setMatch(null)}>
          <div className="modal card center match-modal" onClick={(e) => e.stopPropagation()}>
            <div className="match-spark">♥</div>
            <h1 style={{ margin: "8px 0 4px" }}>It&apos;s a match!</h1>
            <p className="muted">You and {match.name} both expressed interest.</p>
            <button className="btn block" onClick={() => router.push(`/messages/${match.id}`)}>Send a message</button>
            <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setMatch(null)}>Keep exploring</button>
          </div>
        </div>
      )}
    </div>
  );
}
