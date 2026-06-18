import Link from "next/link";
import { PRIVACY_PROMISE } from "@/lib/policy";

export const metadata = { title: "Privacy · Velvet" };

export default function Privacy() {
  return (
    <div className="shell">
      <div className="between" style={{ marginTop: 8 }}>
        <Link href="/" className="brand">VELVET<span className="dot">.</span></Link>
        <Link href="/" className="small">Back</Link>
      </div>
      <h1 style={{ marginTop: 32 }}>Privacy</h1>
      <div className="notice">{PRIVACY_PROMISE}</div>
      <div className="notice warn">
        Starter privacy notice — review with qualified counsel before public launch.
      </div>
      <div className="card stack">
        <p><strong>What we collect.</strong> Your email, a coarse year of birth for age assurance (never your full date of birth), the profile details you choose to share, and basic usage needed to run the service.</p>
        <p><strong>How your profile is shown.</strong> Your profile is visible only to verified members by default, photos stay blurred until you both express interest, and you control your visibility setting at any time.</p>
        <p><strong>What we don&apos;t do.</strong> We don&apos;t sell your personal data. We don&apos;t expose your profile to the public web or to search engines. Notifications are discreet.</p>
        <p><strong>Your controls.</strong> You can edit your profile, change visibility, block other members, and delete your account (which removes your profile and data) from <Link href="/settings">Settings</Link>.</p>
        <p><strong>Safety data.</strong> Reports and moderation records are retained as needed to keep the community safe.</p>
        <p className="muted small">Last updated: starter draft.</p>
      </div>
    </div>
  );
}
