import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { COMMUNITY_STANDARDS, NO_SOLICITATION_NOTICE, NO_EXPLICIT_NOTICE } from "@/lib/policy";
import { acceptStandards } from "../actions";

export default async function Standards() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.consentPledgeAcceptedAt) redirect("/onboarding/consent");
  if (user.standardsAcceptedAt) redirect("/onboarding/profile");

  return (
    <div className="shell" style={{ maxWidth: 560 }}>
      <div className="brand">VELVET<span className="dot">.</span></div>
      <div className="card" style={{ marginTop: 32 }}>
        <h1 style={{ fontSize: "1.5rem" }}>{COMMUNITY_STANDARDS.title}</h1>
        <p className="muted">{COMMUNITY_STANDARDS.intro}</p>
        <div className="sans stack">
          {COMMUNITY_STANDARDS.sections.map((s) => (
            <div key={s.heading}>
              <strong>{s.heading}</strong>
              <p className="muted small" style={{ margin: "2px 0 0" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
        <div className="notice warn sans small">{NO_SOLICITATION_NOTICE}</div>
        <div className="notice warn sans small">{NO_EXPLICIT_NOTICE}</div>
        <form action={acceptStandards}>
          <button className="btn block sans">I agree to the Community Standards</button>
        </form>
      </div>
    </div>
  );
}
