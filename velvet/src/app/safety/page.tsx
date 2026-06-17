import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import { COMMUNITY_STANDARDS } from "@/lib/policy";

export const dynamic = "force-dynamic";

export default async function Safety() {
  await requireOnboarded();

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Safety Center</h1>
        <p className="lede">
          Your safety comes before everything. These tools are always free and always available.
        </p>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Meeting safely</h2>
          <ul className="stack" style={{ paddingLeft: 18 }}>
            <li>Take your time. There's no rush, and no one should pressure you.</li>
            <li>Meet in a public place the first time.</li>
            <li>Tell a friend where you'll be and when you'll check in.</li>
            <li>Trust your instincts — you can pause your profile or leave anytime.</li>
            <li>Keep conversations on Velvet until you feel comfortable.</li>
          </ul>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Consent, always</h2>
          <p className="muted">
            Consent is enthusiastic, ongoing, and can be withdrawn at any time. "No" is a complete
            answer. Respecting boundaries is the baseline here, not the exception.
          </p>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Reporting & blocking</h2>
          <p className="muted">
            You can report or block anyone from their profile or any conversation. Reports are
            confidential and reviewed by our moderation team. We act on harassment, solicitation,
            threats, impersonation, and anything involving minors immediately.
          </p>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Community Standards</h2>
          <div className="stack">
            {COMMUNITY_STANDARDS.sections.map((s) => (
              <div key={s.heading}>
                <strong>{s.heading}</strong>
                <p className="muted small" style={{ margin: "2px 0 0" }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
