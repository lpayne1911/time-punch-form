import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import Shop from "@/components/Shop";
import { getCredits, hasActiveBoost } from "@/lib/purchases";
import { activateBoostAction, activateTravelAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await requireOnboarded();
  const credits = await getCredits(user.id);
  const boostActive = await hasActiveBoost(user.id);
  const travelUntil = user.profile?.travelExpiresAt;
  const travelActive = travelUntil && travelUntil > new Date();

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Add-ons</h1>
        <p className="lede">
          Optional boosts to help you be seen and connect. These improve visibility and convenience —
          they never buy access to anyone, and connection always requires mutual interest.
        </p>

        <Shop credits={credits} />

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Use your add-ons</h2>

          <div className="between" style={{ marginTop: 8 }}>
            <div>
              <strong>Profile Boost</strong>
              <p className="muted small" style={{ margin: 0 }}>
                {boostActive ? "Active now — you're being seen by more members." : `${credits.BOOST ?? 0} available.`}
              </p>
            </div>
            {!boostActive && (
              <form action={activateBoostAction}>
                <button className="btn small" disabled={!(credits.BOOST ?? 0)}>Activate boost</button>
              </form>
            )}
          </div>

          <hr style={{ borderColor: "var(--card-border)", margin: "16px 0" }} />

          <div>
            <strong>Travel Pass</strong>
            <p className="muted small" style={{ margin: "0 0 6px" }}>
              {travelActive
                ? `Active — browsing as ${user.profile?.travelLocation} until ${travelUntil?.toLocaleString()}.`
                : `${credits.TRAVEL_PASS ?? 0} available. Browse as if you're in another city for 24 hours.`}
            </p>
            {!travelActive && (
              <form action={activateTravelAction} className="row">
                <input name="location" placeholder="e.g. Seattle, WA" style={{ margin: 0, flex: 1 }} />
                <button className="btn small" disabled={!(credits.TRAVEL_PASS ?? 0)}>Activate</button>
              </form>
            )}
          </div>

          <hr style={{ borderColor: "var(--card-border)", margin: "16px 0" }} />

          <div>
            <strong>Thoughtful Intros</strong>
            <p className="muted small" style={{ margin: 0 }}>
              {credits.SUPER_LIKE ?? 0} available. Use them from Discover to stand out to someone you're
              genuinely interested in.
            </p>
          </div>
        </div>

        <p className="muted small sans" style={{ marginTop: 12 }}>
          One-time purchases. On iPhone/Android these are processed by the App Store / Google Play.
        </p>
      </div>
    </>
  );
}
