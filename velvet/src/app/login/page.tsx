"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    setDevCode(data.devCode ?? null);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    router.push(data.next);
  }

  return (
    <div className="shell" style={{ maxWidth: 460 }}>
      <Link href="/" className="brand">
        VELVET<span className="dot">.</span>
      </Link>

      <div className="card" style={{ marginTop: 40 }}>
        {step === "email" ? (
          <form onSubmit={requestCode}>
            <div className="seg" role="tablist" style={{ marginBottom: 16 }}>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "create"}
                className={`seg-btn${mode === "create" ? " on" : ""}`}
                onClick={() => setMode("create")}
              >
                Create account
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signin"}
                className={`seg-btn${mode === "signin" ? " on" : ""}`}
                onClick={() => setMode("signin")}
              >
                Sign in
              </button>
            </div>
            <h1 style={{ fontSize: "1.5rem" }}>
              {mode === "create" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="muted small">
              {mode === "create"
                ? "We'll email you a one-time code to get started. No passwords. Verified adults only."
                : "Enter your email and we'll send a one-time sign-in code. No passwords."}
            </p>
            <label>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <h1 style={{ fontSize: "1.5rem" }}>Enter your code</h1>
            <p className="muted small">Sent to {email}. The code expires in 10 minutes.</p>
            {devCode && (
              <div className="notice warn small sans">
                <strong>Preview mode:</strong> your code is <code>{devCode}</code>. In production
                this is delivered by email/SMS and never shown on screen.
              </div>
            )}
            <label>6-digit code</label>
            <input
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              required
            />
            {error && <p className="error">{error}</p>}
            <button className="btn block" disabled={busy}>
              {busy ? "Verifying…" : "Continue"}
            </button>
            <button
              type="button"
              className="btn ghost block"
              style={{ marginTop: 10 }}
              onClick={() => {
                setStep("email");
                setCode("");
                setError("");
              }}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
