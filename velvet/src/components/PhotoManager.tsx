"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Photo = { id: string; status: string };

export default function PhotoManager({ photos }: { photos: Photo[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    <div className="card sans">
      <h2 style={{ marginTop: 0 }}>Photos</h2>
      <p className="muted small">
        Photos are reviewed before they appear, and stay blurred to others until you have a mutual
        match. No nudity or explicit content — keep them respectful.
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
