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

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const buzz = (ms = 10) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(ms);
};

export default function SwipeDeck({ candidates, canRewind }: { candidates: Candidate[]; canRewind: boolean }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<{ x: number; y: number; rot: number } | null>(null);
  const [match, setMatch] = useState<{ name: string; id: string } | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  // History of swiped cards, for rewind (premium).
  const history = useRef<{ index: number; action: Action; userId: string }[]>([]);
  const moved = useRef(false);

  // Drag is driven imperatively (no re-render per move) for native-smooth motion.
  const cardRef = useRef<HTMLDivElement>(null);
  const likeRef = useRef<HTMLSpanElement>(null);
  const nopeRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLSpanElement>(null);
  const start = useRef({ x: 0, y: 0 });
  const drag = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const raf = useRef(0);

  const current = candidates[index];
  const next = candidates[index + 1];

  function paint() {
    raf.current = 0;
    const el = cardRef.current;
    if (!el) return;
    const { x, y } = drag.current;
    el.style.transform = `translate(${x}px, ${y}px) rotate(${x / 18}deg)`;
    if (likeRef.current) likeRef.current.style.opacity = String(clamp(x / THRESH));
    if (nopeRef.current) nopeRef.current.style.opacity = String(clamp(-x / THRESH));
    if (introRef.current) introRef.current.style.opacity = String(clamp(-y / (THRESH * 1.25)));
  }

  function resetStamps() {
    for (const r of [likeRef, nopeRef, introRef]) if (r.current) r.current.style.opacity = "0";
  }

  function advance() {
    setExit(null);
    setIndex((i) => i + 1);
  }

  function rewind() {
    if (busy || exit) return;
    if (!canRewind) {
      setLimit("Rewind is a Plus feature — undo a pass or like with one tap.");
      return;
    }
    const last = history.current.pop();
    if (!last) return;
    buzz(8);
    setMatch(null);
    // Truthfully undo a like/intro on the server; a pass had no server effect.
    if (last.action !== "pass") {
      fetch("/api/unlike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: last.userId }),
      }).catch(() => {});
    }
    setExit(null);
    setIndex(last.index);
  }

  async function commit(action: Action) {
    if (!current || busy) return;
    buzz(action === "pass" ? 8 : 14);
    history.current.push({ index, action, userId: current.userId });
    const d = drag.current;
    const vec =
      action === "pass" ? { x: -700, y: d.y, rot: -28 }
      : action === "intro" ? { x: d.x, y: -800, rot: -4 }
      : { x: 700, y: d.y, rot: 28 };

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
      snapBack();
      setLimit(action === "intro"
        ? "You're out of thoughtful intros. Pick some up in Add-ons."
        : (data.message ?? "You've reached today's like limit."));
      return;
    }
    setExit(vec);
    setTimeout(() => {
      if (data.matched) { buzz(30); setMatch({ name: current.displayName, id: data.matchId }); }
      advance();
    }, 300);
  }

  function snapBack() {
    drag.current = { x: 0, y: 0 };
    const el = cardRef.current;
    if (el) { el.style.transition = ""; el.style.transform = ""; }
    resetStamps();
  }

  function onDown(e: React.PointerEvent) {
    if (busy || exit) return;
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    const el = cardRef.current;
    if (el) el.style.transition = "none";
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    drag.current = { x: e.clientX - start.current.x, y: e.clientY - start.current.y };
    if (Math.abs(drag.current.x) > 6 || Math.abs(drag.current.y) > 6) moved.current = true;
    if (!raf.current) raf.current = requestAnimationFrame(paint);
  }
  function onUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (raf.current) { cancelAnimationFrame(raf.current); raf.current = 0; }
    const el = cardRef.current;
    if (el) el.style.transition = ""; // re-enable CSS transition for snap/fly
    const { x, y } = drag.current;
    // A tap (no real movement) opens the full profile.
    if (!moved.current) { snapBack(); setExpanded(true); return; }
    if (y < -THRESH * 1.25 && Math.abs(x) < THRESH * 1.2) commit("intro");
    else if (x > THRESH) commit("like");
    else if (x < -THRESH) commit("pass");
    else snapBack();
  }

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

  const topTransform = exit ? `translate(${exit.x}px, ${exit.y}px) rotate(${exit.rot}deg)` : undefined;

  return (
    <div className="deck-wrap">
      <div className="deck">
        {next && (
          <div className="deck-card behind" aria-hidden>
            <CardFace c={next} />
          </div>
        )}
        <div
          ref={cardRef}
          className="deck-card front"
          style={exit ? { transform: topTransform } : undefined}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <span ref={likeRef} className="stamp like" style={{ opacity: 0 }}>LIKE</span>
          <span ref={nopeRef} className="stamp nope" style={{ opacity: 0 }}>NOPE</span>
          <span ref={introRef} className="stamp intro" style={{ opacity: 0 }}>INTRO</span>
          <CardFace c={current} front />
        </div>
      </div>

      <div className="swipe-actions">
        <div>
          <button className="swipe-btn rewind" onClick={rewind} disabled={busy} aria-label="Rewind last">↺</button>
          <div className="swipe-label">Rewind</div>
        </div>
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
        Tap a card for more · drag right to like, left to pass, up for an intro.
      </p>

      {expanded && current && (
        <div className="modal-backdrop" onClick={() => setExpanded(false)}>
          <div className="modal card expand-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="between" style={{ marginTop: 4 }}>
              <h2 style={{ margin: 0 }}>
                {current.displayName}{current.ageLabel ? `, ${current.ageLabel}` : ""}
              </h2>
              {current.verification !== "UNVERIFIED" && <span className="badge">✓ Verified</span>}
            </div>
            <div className="row" style={{ gap: 8, margin: "4px 0 10px" }}>
              <span className={`fit ${FIT_CLASS[current.fit] ?? ""}`}>{current.fit}</span>
              <span className="muted small">
                {current.location}{current.experienceLevel ? ` · ${current.experienceLevel}` : ""}
              </span>
            </div>

            <ul className="why">{current.reasons.map((r) => <li key={r}>{r}</li>)}</ul>

            {current.intentions.length > 0 && (
              <>
                <label>Looking for</label>
                <div className="pill-list" style={{ margin: "4px 0 10px" }}>
                  {current.intentions.map((t) => <span key={t} className="tag readonly">{t}</span>)}
                </div>
              </>
            )}
            {current.interests.length > 0 && (
              <>
                <label>Interests</label>
                <div className="pill-list" style={{ margin: "4px 0 10px" }}>
                  {current.interests.map((t) => <span key={t} className="tag readonly">{t}</span>)}
                </div>
              </>
            )}
            {current.values.length > 0 && (
              <>
                <label>Values</label>
                <div className="pill-list" style={{ margin: "4px 0 10px" }}>
                  {current.values.map((t) => <span key={t} className="tag readonly">{t}</span>)}
                </div>
              </>
            )}

            <div className="swipe-actions" style={{ marginTop: 16 }}>
              <button className="swipe-btn pass" onClick={() => { setExpanded(false); commit("pass"); }} aria-label="Pass">✕</button>
              <button className="swipe-btn like" onClick={() => { setExpanded(false); commit("like"); }} aria-label="Like">♥</button>
              <button className="swipe-btn intro" onClick={() => { setExpanded(false); commit("intro"); }} aria-label="Intro">★</button>
            </div>
          </div>
        </div>
      )}

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
