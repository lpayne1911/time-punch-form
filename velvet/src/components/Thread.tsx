"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONSENT_REMINDER, MEETING_SAFETY_NUDGE, REPORT_CATEGORIES } from "@/lib/safety";

type Msg = {
  id: string; body: string; senderId: string;
  flagged: boolean; quarantined?: boolean; readAt?: string | null;
};

export default function Thread({
  matchId, meId, otherId, otherName, otherPhotoId,
  starters, canSeeReceipts, reveal, paused, expiresAt, myAftercare,
  initialMessages, alreadyBlocked,
}: {
  matchId: string;
  meId: string;
  otherId: string;
  otherName: string;
  otherPhotoId: string | null;
  starters: string[];
  canSeeReceipts: boolean;
  reveal: { mine: boolean; theirs: boolean; both: boolean };
  paused: { byMe: boolean } | null;
  expiresAt: string | null;
  myAftercare: string | null;
  initialMessages: Msg[];
  alreadyBlocked: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [intro, setIntro] = useState("");
  const [interest, setInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(alreadyBlocked);
  const [showReport, setShowReport] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState("");
  const [revealDismissed, setRevealDismissed] = useState(false);
  const [aftercareDone, setAftercareDone] = useState(false);
  const [aftercareNegative, setAftercareNegative] = useState(false);

  const isFirst = messages.length === 0;

  async function postBody(body: string) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, body }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setError(data.error ?? "Couldn't send."); return false; }
    setMessages((m) => [...m, data.message]);
    if (data.nudgeContactInfo) setNudge(true);
    return true;
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (await postBody(text.trim())) setText("");
  }

  async function sendFirst(e: React.FormEvent) {
    e.preventDefault();
    const body = [intro.trim(), interest.trim()].filter(Boolean).join("\n\n");
    if (!body) return;
    if (await postBody(body)) { setIntro(""); setInterest(""); }
  }

  async function matchAction(action: string, answer?: string) {
    await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, action, answer }),
    });
    router.refresh();
  }

  async function block() {
    if (!confirm(`Block ${otherName}? They won't be able to contact you, and this conversation closes.`)) return;
    await fetch("/api/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockedId: otherId }),
    });
    setBlocked(true);
  }

  async function report(category: string) {
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedId: otherId, category }),
    });
    setShowReport(false);
    alert("Thank you. Our moderation team reviews every report.");
  }

  // Hours left in the intro window (only relevant before the first message).
  const hoursLeft = expiresAt ? Math.round((new Date(expiresAt).getTime() - Date.now()) / 3_600_000) : null;
  const windowOpen = hoursLeft !== null && hoursLeft > 0;

  // Index of my last message the other side has read (read receipts, #46).
  const lastReadIdx = canSeeReceipts
    ? messages.map((m, i) => (m.senderId === meId && m.readAt ? i : -1)).reduce((a, b) => Math.max(a, b), -1)
    : -1;

  const composerDisabled = blocked || !!paused;

  return (
    <>
      <div className="between sans">
        <button className="btn ghost small" onClick={() => router.push("/matches")}>‹ Matches</button>
        <div className="row" style={{ gap: 8 }}>
          {reveal.both && otherPhotoId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/photo/${otherPhotoId}`}
              alt={otherName}
              style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <strong>{otherName}</strong>
        </div>
        <div className="row">
          <button className="btn ghost small" onClick={() => setShowReport((s) => !s)}>Report</button>
          {!blocked && !paused && (
            <button className="btn ghost small" onClick={() => matchAction("pause")}>Pause</button>
          )}
          {!blocked && <button className="btn danger small" onClick={block}>Block</button>}
        </div>
      </div>

      {showReport && (
        <div className="card sans">
          <strong>Report {otherName}</strong>
          <p className="muted small">Reports are confidential and reviewed by our moderation team.</p>
          <div className="stack">
            {REPORT_CATEGORIES.map((c) => (
              <button key={c.value} className="btn ghost small block" onClick={() => report(c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Paused (#49) */}
      {paused && (
        <div className="notice warn sans small">
          <strong>Conversation paused{paused.byMe ? " by you" : ""}.</strong> No new messages until it resumes.
          <div style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => matchAction("resume")}>Resume conversation</button>
          </div>
        </div>
      )}

      {/* Intro window (#48) — only before the first message */}
      {!paused && !blocked && isFirst && (
        <div className="notice sans small">
          {windowOpen ? (
            <>Intro window closes in about <strong>{hoursLeft}h</strong> — say hello, or extend it.</>
          ) : (
            <>The intro window has closed. You can reopen it to reach out.</>
          )}
          <div style={{ marginTop: 8 }}>
            <button className="btn ghost small" onClick={() => matchAction("extend")}>Extend 48h</button>
          </div>
        </div>
      )}

      {/* Mutual photo reveal (#44/#45) */}
      {!reveal.both && !blocked && !revealDismissed && (
        <div className="notice sans small">
          {reveal.mine ? (
            <>You&apos;ve opted to reveal photos. Waiting for {otherName} to opt in too.</>
          ) : reveal.theirs ? (
            <>
              <strong>{otherName} would like to reveal photos.</strong> Photos un-blur only when you both opt in.
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <button className="btn small" onClick={() => matchAction("reveal")}>Reveal mine too</button>
                <button className="btn ghost small" onClick={() => setRevealDismissed(true)}>Not yet</button>
              </div>
            </>
          ) : (
            <>
              Photos stay blurred until you both opt in.
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <button className="btn small" onClick={() => matchAction("reveal")}>Request photo reveal</button>
                <button className="btn ghost small" onClick={() => setRevealDismissed(true)}>Not yet</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="notice sans small">{CONSENT_REMINDER}</div>

      <div className="card" style={{ minHeight: 200 }}>
        {messages.length === 0 && (
          <p className="muted center sans">Start the conversation with something thoughtful.</p>
        )}
        {messages.map((m, idx) => (
          <div key={m.id}>
            <div className={`msg sans ${m.senderId === meId ? "me" : "them"} ${m.flagged ? "flagged" : ""}`}>
              {m.body}
              {m.quarantined ? (
                <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>⏳ Held for review — not delivered yet</div>
              ) : m.flagged ? (
                <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>⚑ Flagged for review</div>
              ) : null}
            </div>
            {idx === lastReadIdx && (
              <div className="small muted sans" style={{ textAlign: "right", margin: "-2px 2px 6px" }}>Read</div>
            )}
          </div>
        ))}
      </div>

      {nudge && <div className="notice warn sans small">{MEETING_SAFETY_NUDGE}</div>}

      {/* Aftercare check-in (#50) — once there's been a conversation */}
      {!isFirst && !blocked && !myAftercare && !aftercareDone && (
        <div className="notice ok sans small">
          {aftercareNegative ? (
            <>
              Thank you for sharing. If something felt off, you can report or block above — our team
              reviews every report, and there&apos;s no penalty for protecting yourself.
            </>
          ) : (
            <>
              <strong>Quick check-in:</strong> did this interaction feel respectful?
              <div className="row" style={{ marginTop: 8, gap: 8 }}>
                <button className="btn small" onClick={() => { matchAction("aftercare", "respectful"); setAftercareDone(true); }}>
                  Yes, all good
                </button>
                <button className="btn ghost small" onClick={() => { matchAction("aftercare", "not"); setAftercareNegative(true); }}>
                  Not really
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Conversation starters (#42) */}
      {!composerDisabled && starters.length > 0 && messages.length < 2 && (
        <div className="sans" style={{ marginTop: 12 }}>
          <p className="muted small" style={{ margin: "0 0 6px" }}>Need an opener? Try one of these:</p>
          <div className="pill-list">
            {starters.map((s) => (
              <span key={s} className="tag" onClick={() => (isFirst ? setInterest(s) : setText(s))}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {composerDisabled ? (
        blocked && <div className="notice danger sans small">This conversation is closed.</div>
      ) : isFirst ? (
        // Guided first message (#43): a respectful intro + what caught your interest.
        <form onSubmit={sendFirst} className="sans" style={{ marginTop: 12 }}>
          <label>Say hello — a respectful intro</label>
          <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Hi, I'm…" />
          <label>What caught your interest?</label>
          <textarea value={interest} onChange={(e) => setInterest(e.target.value)} rows={2}
            placeholder="Something specific from their profile." />
          <button className="btn block" disabled={busy}>{busy ? "…" : "Send first message"}</button>
        </form>
      ) : (
        <form onSubmit={send} className="row sans" style={{ marginTop: 12 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a respectful message…" style={{ flex: 1, margin: 0 }} />
          <button className="btn" disabled={busy}>{busy ? "…" : "Send"}</button>
        </form>
      )}
      {error && <p className="error sans">{error}</p>}

      <div className="notice sans small" style={{ marginTop: 18 }}>{MEETING_SAFETY_NUDGE}</div>
    </>
  );
}
