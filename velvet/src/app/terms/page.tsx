import Link from "next/link";

export const metadata = { title: "Terms of Use · Velvet" };

export default function Terms() {
  return (
    <div className="shell">
      <div className="between" style={{ marginTop: 8 }}>
        <Link href="/" className="brand">VELVET<span className="dot">.</span></Link>
        <Link href="/" className="small">Back</Link>
      </div>
      <h1 style={{ marginTop: 32 }}>Terms of Use</h1>
      <div className="notice warn">
        Starter terms — review with qualified counsel before public launch.
      </div>
      <div className="card stack">
        <p><strong>Eligibility.</strong> Velvet is for adults 18+ (or the age of majority where you live). You must verify your identity to gain full access.</p>
        <p><strong>Acceptable use.</strong> Velvet is a consent-first community and is not a marketplace. No explicit content, no solicitation or sale of services, no harassment, and no impersonation. See our <Link href="/guidelines">Community Guidelines</Link>.</p>
        <p><strong>Your account.</strong> Keep your login secure. You&apos;re responsible for activity on your account. We may suspend or remove accounts that violate these terms or our guidelines.</p>
        <p><strong>Content.</strong> You own what you share, and grant Velvet a limited license to display it to other members as part of the service. Don&apos;t post anything you don&apos;t have the right to share.</p>
        <p><strong>Subscriptions.</strong> Paid tiers renew automatically until canceled; billing and cancellation are handled by the App Store or Google Play where applicable. Safety tools are always free.</p>
        <p><strong>No warranty / liability.</strong> Velvet is provided &ldquo;as is.&rdquo; We work hard on safety but cannot guarantee outcomes or the conduct of other members. Always meet in public and use good judgment.</p>
        <p className="muted small">Last updated: starter draft.</p>
      </div>
    </div>
  );
}
