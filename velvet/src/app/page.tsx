import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, onboardingNext } from "@/lib/auth";
import { PRIVACY_PROMISE } from "@/lib/policy";

export default async function Landing() {
  const user = await getCurrentUser();
  if (user) {
    redirect(onboardingNext(user) ?? "/discover");
  }

  return (
    <div className="shell">
      <div className="brand center" style={{ marginTop: 40 }}>
        VELVET<span className="dot">.</span>
      </div>

      <div className="center" style={{ marginTop: 60 }}>
        <h1>Connection, on your terms.</h1>
        <p className="lede">
          A private, members-first dating and community app for verified adults who value
          intentional connection — built around consent, privacy, and respect.
        </p>
        <div style={{ marginTop: 28 }}>
          <Link href="/login" className="btn">
            Enter
          </Link>
        </div>
        <p className="muted small" style={{ marginTop: 14 }}>
          For adults 18+ (or the age of majority where you live).
        </p>
      </div>

      <div className="card" style={{ marginTop: 50 }}>
        <h2 style={{ marginTop: 0 }}>What makes Velvet different</h2>
        <div className="stack sans">
          <p>
            <strong>Compatibility before everything.</strong> Match on shared values,
            communication styles, and relationship intentions — not endless swiping.
          </p>
          <p>
            <strong>Private by design.</strong> {PRIVACY_PROMISE}
          </p>
          <p>
            <strong>Consent-first community.</strong> Every member is a verified adult who agrees
            to our community standards. Human moderation, reporting, and blocking keep it safe.
          </p>
          <p className="muted">
            Velvet is not a marketplace and has no explicit content. It is a place for thoughtful
            connection among adults who understand.
          </p>
        </div>
      </div>

      <div className="footer-legal">
        A consent-first community for verified adults. © Velvet.
        <br />
        Demo build — see reviewer notes in the project blueprint.
      </div>
    </div>
  );
}
