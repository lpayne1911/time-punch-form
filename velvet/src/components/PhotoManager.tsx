"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Photo = { id: string; status: string; visibility: string };

export default function PhotoManager({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState("");

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    setMsg("");
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch("/api/photo/upload", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!res.ok) return setError(data.error ?? "Upload failed.");
    setMsg(data.notice);
    router.refresh();
  }

  async function toggleVisibility(p: Photo) {
    const next = p.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    setTogglingId(p.id);
    setError("");
    const res = await fetch(`/api/photo/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    setTogglingId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return setError(data.error ?? "Couldn't update that photo.");
    }
    router.refresh();
  }

  return (
    <div className="card sans">
      <h2 style={{ marginTop: 0 }}>Photos</h2>
      <p className="muted small">
        Photos are reviewed before they appear. Once approved they&apos;re public by default —
        shown on your card in Discover. Mark any photo <strong>private</strong> to keep it for
        mutual matches only. No nudity or explicit content — keep them respectful.
      </p>

      {photos.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(110px,1fr))", gap: 10, margin: "10px 0" }}>
          {photos.map((p) => (
            <div key={p.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo/${p.id}`}
                alt="your upload"
                style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 10, opacity: p.status === "APPROVED" ? 1 : 0.6 }}
              />
              <p className="small muted center" style={{ margin: "4px 0 0" }}>
                {p.status === "APPROVED" ? "✓ live" : p.status === "PENDING" ? "in review" : "rejected"}
              </p>
              <button
                type="button"
                className="btn ghost small block"
                style={{ marginTop: 4 }}
                onClick={() => toggleVisibility(p)}
                disabled={togglingId === p.id}
              >
                {p.visibility === "PUBLIC" ? "🌐 Public" : "🔒 Private"}
              </button>
            </div>
          ))}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={busy} />
      {busy && <p className="muted small">Uploading…</p>}
      {msg && <div className="notice ok small">{msg}</div>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
