"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CONSENT_REMINDER, MEETING_SAFETY_NUDGE, REPORT_CATEGORIES } from "@/lib/safety";

type Msg = { id: string; body: string; senderId: string; flagged: boolean; quarantined?: boolean };

export default function Thread({
  matchId,
  meId,
  otherId,
  otherName,
  otherPhotoId,
  initialMessages,
  alreadyBlocked,
}: {
  matchId: string;
  meId: string;
  otherId: string;
  otherName: string;
  otherPhotoId: string | null;
  initialMessages: Msg[];
  alreadyBlocked: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(alreadyBlocked);
  const [showReport, setShowReport] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState("");

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId, body: text }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Couldn't send.");
    setMessages((m) => [...m, data.message]);
    setText("");
    if (data.nudgeContactInfo) setNudge(true);
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

  return (
    <>
      <div className="between sans">
        <button className="btn ghost small" onClick={() => router.push("/matches")}>‹ Matches</button>
        <div className="row" style={{ gap: 8 }}>
          {otherPhotoId && (
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

      <div className="notice sans small">{CONSENT_REMINDER}</div>

      <div className="card" style={{ minHeight: 240 }}>
        {messages.length === 0 && (
          <p className="muted center sans">Start the conversation with something thoughtful.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`msg sans ${m.senderId === meId ? "me" : "them"} ${m.flagged ? "flagged" : ""}`}
          >
            {m.body}
            {m.quarantined ? (
              <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>
                ⏳ Held for review — not delivered yet
              </div>
            ) : m.flagged ? (
              <div className="small" style={{ opacity: 0.8, marginTop: 4 }}>
                ⚑ Flagged for review
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {nudge && <div className="notice warn sans small">{MEETING_SAFETY_NUDGE}</div>}

      {blocked ? (
        <div className="notice danger sans small">This conversation is closed.</div>
      ) : (
        <form onSubmit={send} className="row sans" style={{ marginTop: 12 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a respectful message…"
            style={{ flex: 1, margin: 0 }}
          />
          <button className="btn" disabled={busy}>{busy ? "…" : "Send"}</button>
        </form>
      )}
      {error && <p className="error sans">{error}</p>}

      <div className="notice sans small" style={{ marginTop: 18 }}>
        {MEETING_SAFETY_NUDGE}
      </div>
    </>
  );
}
