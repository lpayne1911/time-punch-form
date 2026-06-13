"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SimulateVerification({ checkId }: { checkId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function decide(approved: boolean) {
    setBusy(true);
    await fetch("/api/verification/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkId, approved }),
    });
    router.push("/verify");
    router.refresh();
  }

  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <button className="btn" disabled={busy} onClick={() => decide(true)}>
        Simulate success
      </button>
      <button className="btn ghost" disabled={busy} onClick={() => decide(false)}>
        Simulate failure
      </button>
    </div>
  );
}
