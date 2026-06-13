"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { levelRank } from "@/lib/verification-levels";

export default function VerifyActions({
  level,
  pendingPhoto,
  pendingId,
}: {
  level: string;
  pendingPhoto: boolean;
  pendingId: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function start(type: "PHOTO_LIVENESS" | "ID_DOCUMENT") {
    setBusy(type);
    const res = await fetch("/api/verification/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const data = await res.json();
    setBusy("");
    if (res.ok && data.redirectUrl) router.push(data.redirectUrl);
  }

  const rank = levelRank(level);

  return (
    <div className="card sans">
      <h2 style={{ marginTop: 0 }}>Get verified</h2>
      <div className="stack">
        {rank >= 2 ? (
          <div className="notice ok small">✓ Photo verified.</div>
        ) : pendingPhoto ? (
          <div className="notice warn small">Photo verification in progress…</div>
        ) : (
          <button className="btn block" disabled={!!busy} onClick={() => start("PHOTO_LIVENESS")}>
            {busy === "PHOTO_LIVENESS" ? "Starting…" : "Verify with a selfie"}
          </button>
        )}

        {rank >= 3 ? (
          <div className="notice ok small">✓ ID verified.</div>
        ) : pendingId ? (
          <div className="notice warn small">ID verification in progress…</div>
        ) : (
          <button className="btn ghost block" disabled={!!busy} onClick={() => start("ID_DOCUMENT")}>
            {busy === "ID_DOCUMENT" ? "Starting…" : "Verify your ID"}
          </button>
        )}
      </div>
    </div>
  );
}
