"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIERS, type Interval, type Tier } from "@/lib/billing";

const FEATURE_LABELS: Record<string, string> = {
  unlimitedLikes: "Unlimited likes",
  seeWhoLikedYou: "See who likes you",
  readReceipts: "Read receipts",
  moreDailyRecs: "More daily recommendations",
  incognito: "Incognito browsing",
  verifiedOnlyBrowsing: "Verified-only browsing",
  travelMode: "Travel mode",
  advancedFilters: "Advanced compatibility filters",
  hideFromDiscovery: "Hide from general discovery",
  profileVisibilityAudit: "Profile visibility audit",
  privateCircles: "Private circles & event access",
  priorityProfileReview: "Priority profile review",
  conciergeSupport: "Concierge support",
};

export default function Paywall({
  currentTier,
  highlight,
}: {
  currentTier: Tier;
  highlight?: string | null;
}) {
  const router = useRouter();
  const [interval, setInterval] = useState<Interval>("YEAR");
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  async function subscribe(tier: Tier) {
    setBusy(tier);
    setError("");
    const res = await fetch("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, interval }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return setError(data.error ?? "Couldn't start subscription.");
    router.push("/settings");
    router.refresh();
  }

  const paid = TIERS.filter((t) => t.id !== "FREE");

  return (
    <div className="sans">
      {highlight && (
        <div className="notice small">
          Heads up — <strong>{FEATURE_LABELS[highlight] ?? highlight}</strong> is a premium feature.
          Here's what's included.
        </div>
      )}

      <div className="row" style={{ justifyContent: "center", margin: "10px 0 18px" }}>
        <button
          className={`btn small ${interval === "MONTH" ? "" : "ghost"}`}
          onClick={() => setInterval("MONTH")}
        >
          Monthly
        </button>
        <button
          className={`btn small ${interval === "YEAR" ? "" : "ghost"}`}
          onClick={() => setInterval("YEAR")}
        >
          Annual · save more
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        {paid.map((t) => {
          const monthlyEquiv = interval === "YEAR" ? (t.annual / 12).toFixed(2) : t.monthly.toFixed(2);
          const isCurrent = currentTier === t.id;
          const savings = Math.round((1 - t.annual / (t.monthly * 12)) * 100);
          return (
            <div
              key={t.id}
              className="card"
              style={{
                margin: 0,
                borderColor: t.id === "PREMIUM" ? "var(--accent)" : undefined,
                boxShadow: t.id === "PREMIUM" ? "0 0 0 1px var(--accent), var(--glow)" : undefined,
              }}
            >
              {t.id === "PREMIUM" && <span className="badge" style={{ marginBottom: 6 }}>Most popular</span>}
              <h2 style={{ margin: "0 0 4px" }}>{t.name}</h2>
              <p className="muted small" style={{ margin: 0 }}>{t.forWho}</p>
              <div style={{ margin: "12px 0 2px", fontFamily: "var(--serif)", fontSize: "2.2rem", fontWeight: 700 }}>
                ${monthlyEquiv}
                <span className="muted small" style={{ fontWeight: 400, fontFamily: "var(--sans)" }}> /mo</span>
              </div>
              <p className="muted small" style={{ margin: 0 }}>
                {interval === "YEAR" ? `$${t.annual.toFixed(2)} billed yearly · save ${savings}%` : "billed monthly"}
              </p>
              <p style={{ margin: "10px 0 6px" }}>{t.blurb}</p>
              <ul className="small stack" style={{ paddingLeft: 18, margin: "0 0 12px" }}>
                {t.features.map((f) => (
                  <li key={f}>{FEATURE_LABELS[f]}</li>
                ))}
                {t.id !== "PLUS" && <li className="muted">…plus everything below</li>}
              </ul>
              <button
                className={`btn block ${isCurrent ? "ghost" : ""}`}
                disabled={isCurrent || !!busy}
                onClick={() => subscribe(t.id)}
              >
                {isCurrent ? "Your plan" : busy === t.id ? "…" : `Choose ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {error && <p className="error">{error}</p>}

      <p className="muted small" style={{ marginTop: 16 }}>
        Subscriptions renew automatically until canceled. Cancel anytime — you keep access until the
        end of your billing period. On iPhone and Android, billing and cancellation are handled by
        the App Store and Google Play.
      </p>
      <p className="muted small">
        We never charge for access to any person or for any content. Your safety tools — verification,
        blocking, reporting, and account deletion — are always free.
      </p>
    </div>
  );
}
