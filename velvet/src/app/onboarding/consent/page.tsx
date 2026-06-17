import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CONSENT_PLEDGE } from "@/lib/policy";
import { acceptConsent } from "../actions";

export default async function ConsentPledge() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.ageConfirmed) redirect("/onboarding/age");
  if (user.consentPledgeAcceptedAt) redirect("/onboarding/standards");

  return (
    <div className="shell" style={{ maxWidth: 540 }}>
      <div className="brand">VELVET<span className="dot">.</span></div>
      <div className="card" style={{ marginTop: 32 }}>
        <h1 style={{ fontSize: "1.5rem" }}>{CONSENT_PLEDGE.title}</h1>
        <p className="muted">{CONSENT_PLEDGE.intro}</p>
        <ul className="sans stack" style={{ paddingLeft: 18 }}>
          {CONSENT_PLEDGE.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <form action={acceptConsent}>
          <button className="btn block sans" style={{ marginTop: 12 }}>
            I take this pledge
          </button>
        </form>
      </div>
    </div>
  );
}
