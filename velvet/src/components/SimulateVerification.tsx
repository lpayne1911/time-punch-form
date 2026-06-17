import { simulateDecision } from "@/app/verify/actions";

// Server-action driven (no client fetch to a public webhook). Each button binds
// the dev decision and posts through an authenticated server action.
export default function SimulateVerification({ checkId }: { checkId: string }) {
  return (
    <div className="row" style={{ justifyContent: "center" }}>
      <form action={simulateDecision.bind(null, checkId, true)}>
        <button className="btn">Simulate success</button>
      </form>
      <form action={simulateDecision.bind(null, checkId, false)}>
        <button className="btn ghost">Simulate failure</button>
      </form>
    </div>
  );
}
