"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SHOP_ITEMS, formatCents } from "@/lib/shop";

export default function Shop({ credits }: { credits: Record<string, number> }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function buy(kind: string) {
    setBusy(kind);
    await fetch("/api/billing/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setBusy("");
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
      {SHOP_ITEMS.map((item) => (
        <div key={item.kind} className="card sans" style={{ margin: 0 }}>
          <div className="between">
            <strong>{item.name}</strong>
            <span className="badge">{credits[item.kind] ?? 0} owned</span>
          </div>
          <p className="muted small" style={{ margin: "6px 0 12px" }}>{item.description}</p>
          <button className="btn block" disabled={busy === item.kind} onClick={() => buy(item.kind)}>
            {busy === item.kind ? "…" : `Buy · ${formatCents(item.priceCents)}`}
          </button>
        </div>
      ))}
    </div>
  );
}
