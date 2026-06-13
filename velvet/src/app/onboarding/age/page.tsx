import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { confirmAge } from "../actions";

export default async function AgeGate({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.ageConfirmed) redirect("/onboarding/consent");
  const { error } = await searchParams;

  return (
    <div className="shell" style={{ maxWidth: 480 }}>
      <div className="brand">VELVET<span className="dot">.</span></div>
      <div className="card" style={{ marginTop: 32 }}>
        <h1 style={{ fontSize: "1.5rem" }}>Adults only</h1>
        <p className="muted">
          Velvet is exclusively for adults 18 and over (or the age of majority where you live).
          Please confirm your age to continue.
        </p>
        {error && (
          <div className="notice danger small sans">
            You must be 18 or older to use Velvet.
          </div>
        )}
        <form action={confirmAge} className="sans">
          <label>Year of birth</label>
          <input name="dobYear" inputMode="numeric" placeholder="e.g. 1990" required />
          <label className="row" style={{ alignItems: "flex-start", gap: 10, marginTop: 8 }}>
            <input type="checkbox" name="over18" style={{ width: "auto", margin: "4px 0 0" }} required />
            <span>I confirm I am 18 years of age or older (or the age of majority where I live).</span>
          </label>
          <button className="btn block" style={{ marginTop: 16 }}>
            Confirm & continue
          </button>
        </form>
      </div>
      <p className="footer-legal">
        We store only a coarse year for age assurance — never your full date of birth.
      </p>
    </div>
  );
}
