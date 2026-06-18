import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, onboardingNext } from "@/lib/auth";
import { PRIVACY_PROMISE } from "@/lib/policy";
import SiteFooter from "@/components/SiteFooter";

export const dynamic = "force-dynamic";

/* Sample profiles shown on the landing page so visitors see the product
   immediately. These are illustrative, not real members. */
const SAMPLE = [
  { name: "Rowan", age: 34, loc: "Portland, OR", fit: "Strong fit", tags: ["Communication & negotiation", "Trust & vulnerability"], why: "You're both looking for a long-term connection" },
  { name: "Sage", age: 29, loc: "Portland, OR", fit: "Some overlap", tags: ["Education & learning", "Aftercare & support"], why: "Shared interest in education & learning" },
];

function Icon({ name }: { name: string }) {
  const c = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
  switch (name) {
    case "shield": return <svg {...c}><path d="M12 3l7 3v5c0 4.4-3 7.5-7 9-4-1.5-7-4.6-7-9V6l7-3Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case "eye-off": return <svg {...c}><path d="M3 3l18 18" /><path d="M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 4.5 9 6a11 11 0 0 1-2.2 3M6.3 8.3A11.6 11.6 0 0 0 3 12c0 1.5 4 6 9 6a9.4 9.4 0 0 0 3.7-.7" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
    case "hand": return <svg {...c}><path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-1.6-3a1.5 1.5 0 0 1 2.5-1.6L8 14" /></svg>;
    case "lock": return <svg {...c}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
    case "badge": return <svg {...c}><circle cx="12" cy="9" r="6" /><path d="m9 9 2 2 4-4M8.5 14.5 7 22l5-2.5L17 22l-1.5-7.5" /></svg>;
    case "cards": return <svg {...c}><rect x="3" y="6" width="13" height="14" rx="2" /><path d="M8 3h11a2 2 0 0 1 2 2v12" /></svg>;
    case "spark": return <svg {...c}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
    default: return null;
  }
}

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) {
    redirect(onboardingNext(user) ?? "/discover");
  }

  return (
    <div className="landing">
      <div className="shell">
        {/* Top bar */}
        <div className="between" style={{ marginTop: 8 }}>
          <span className="brand">VELVET<span className="dot">.</span></span>
          <Link href="/login" className="small">Sign in</Link>
        </div>

        {/* Hero */}
        <section className="hero center">
          <h1 className="hero-title">Private dating for verified, consent-first adults.</h1>
          <p className="lede" style={{ maxWidth: 540, margin: "0 auto" }}>
            Match on shared values, intentions, and communication — not endless swiping.
            Built around consent, privacy, and respect.
          </p>
          <p className="brand-safety">Not explicit. Not transactional. Not public.</p>

          <div className="cta-row">
            <Link href="/login" className="btn">Enter</Link>
            <Link href="#how" className="btn ghost">See how it works</Link>
          </div>

          <div className="trust-badges">
            <span className="trust"><Icon name="badge" /> Verified adults only</span>
            <span className="trust"><Icon name="eye-off" /> Blurred photos</span>
            <span className="trust"><Icon name="hand" /> Consent-first</span>
            <span className="trust"><Icon name="lock" /> No public browsing</span>
          </div>

          <p className="muted small" style={{ marginTop: 12 }}>
            For adults 18+ (or the age of majority where you live).
          </p>
        </section>

        {/* Product preview — sample cards */}
        <section>
          <p className="muted small center" style={{ marginBottom: 4 }}>A peek at Discover</p>
          <div className="sample-grid">
            {SAMPLE.map((s) => (
              <div key={s.name} className="card sample-card">
                <div className="blur-photo" style={{ height: 130 }}>Photo blurred until mutual interest</div>
                <div className="between" style={{ marginTop: 10 }}>
                  <strong>{s.name}, {s.age}</strong>
                  <span className="badge">✓ Verified</span>
                </div>
                <div className="row" style={{ gap: 8, margin: "4px 0" }}>
                  <span className={`fit ${s.fit === "Strong fit" ? "fit-strong" : "fit-some"}`}>{s.fit}</span>
                  <span className="muted small">{s.loc}</span>
                </div>
                <p className="small" style={{ color: "var(--ink-soft)", margin: "6px 0" }}>✓ {s.why}</p>
                <div className="pill-list">
                  {s.tags.map((t) => <span key={t} className="tag readonly">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
          <p className="muted small center">Illustrative profiles — your real matches appear after you join.</p>
        </section>

        {/* How it works */}
        <section id="how">
          <h2 className="center">How Velvet works</h2>
          <div className="steps">
            <div className="step card">
              <div className="step-icon"><Icon name="badge" /></div>
              <div className="step-n">1</div>
              <strong>Verify</strong>
              <p className="muted small">Confirm you&apos;re a real adult. Everyone here is verified — no bots, no fakes.</p>
            </div>
            <div className="step card">
              <div className="step-icon"><Icon name="cards" /></div>
              <div className="step-n">2</div>
              <strong>Build your profile</strong>
              <p className="muted small">Share your values, intentions, and boundaries — the things that actually fit.</p>
            </div>
            <div className="step card">
              <div className="step-icon"><Icon name="spark" /></div>
              <div className="step-n">3</div>
              <strong>Match privately</strong>
              <p className="muted small">We surface compatible people. Photos stay blurred until you both opt in.</p>
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section>
          <h2 className="center">What makes Velvet different</h2>
          <div className="feature-grid">
            <div className="card feature">
              <div className="step-icon"><Icon name="spark" /></div>
              <strong>Compatibility before everything</strong>
              <p className="muted small">Match on shared values, communication styles, and intentions — not photos.</p>
            </div>
            <div className="card feature">
              <div className="step-icon"><Icon name="shield" /></div>
              <strong>Private by design</strong>
              <p className="muted small">{PRIVACY_PROMISE}</p>
            </div>
            <div className="card feature">
              <div className="step-icon"><Icon name="hand" /></div>
              <strong>Consent-first community</strong>
              <p className="muted small">Every member agrees to our pledge. Human moderation, reporting, and blocking keep it safe.</p>
            </div>
          </div>
        </section>

        {/* Social proof placeholder */}
        <section className="center">
          <p className="lede" style={{ maxWidth: 520, margin: "0 auto" }}>
            &ldquo;Built for privacy-first adults seeking intentional connection.&rdquo;
          </p>
        </section>

        {/* Final CTA */}
        <section className="center">
          <Link href="/login" className="btn">Enter Velvet</Link>
        </section>

        <SiteFooter />
      </div>
    </div>
  );
}
