import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import DeleteAccount from "@/components/DeleteAccount";
import { VISIBILITY_OPTIONS } from "@/lib/tags";
import { getEntitlements, getSubscription } from "@/lib/entitlements";
import { tierDef } from "@/lib/billing";
import {
  setPaused,
  setIncognito,
  setHideFromDiscovery,
  setDiscoverVerifiedOnly,
  setTravelLocation,
  updateVisibility,
  logout,
  deleteAccount,
} from "./actions";
import { cancelSubscription, resumeSubscription } from "./billing-actions";

export const dynamic = "force-dynamic";

// A premium toggle row that shows an upgrade link when the feature is locked.
function PremiumToggle({
  title,
  desc,
  enabled,
  locked,
  feature,
  action,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  locked: boolean;
  feature: string;
  action: React.ReactNode;
}) {
  return (
    <div className="between" style={{ marginTop: 14 }}>
      <div>
        <strong>{title}</strong>{" "}
        {locked && <span className="badge" style={{ fontSize: "0.65rem" }}>Premium</span>}
        <p className="muted small" style={{ margin: 0 }}>{desc}</p>
      </div>
      {/* Locked + already on → still allow turning it off (no lock-in). */}
      {locked && !enabled ? (
        <Link href={`/premium?feature=${feature}`} className="btn ghost small">Upgrade</Link>
      ) : (
        action
      )}
    </div>
  );
}

export default async function Settings() {
  const user = await requireOnboarded();
  const ent = await getEntitlements(user.id);
  const sub = await getSubscription(user.id);
  const def = tierDef(ent.tier);
  const paused = user.status === "PAUSED";
  const p = user.profile!;

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Settings</h1>

        <div className="card sans">
          <div className="between">
            <h2 style={{ margin: 0 }}>Membership</h2>
            <span className="badge">{def.name}</span>
          </div>
          {ent.isPaid ? (
            <>
              <p className="muted small" style={{ marginTop: 8 }}>
                {sub?.cancelAtPeriodEnd
                  ? `Canceled — access continues until ${sub.currentPeriodEnd?.toLocaleDateString()}.`
                  : `Renews ${sub?.currentPeriodEnd?.toLocaleDateString() ?? "automatically"}.`}
              </p>
              <div className="row">
                <Link href="/premium" className="btn ghost small">Change plan</Link>
                {sub?.cancelAtPeriodEnd ? (
                  <form action={resumeSubscription}><button className="btn small">Resume</button></form>
                ) : (
                  <form action={cancelSubscription}><button className="btn ghost small">Cancel</button></form>
                )}
              </div>
              <p className="muted small" style={{ marginTop: 8 }}>
                On iPhone/Android, manage or cancel in your App Store / Google Play subscription settings.
              </p>
            </>
          ) : (
            <>
              <p className="muted small" style={{ marginTop: 8 }}>
                You're on the free plan. Upgrade for more privacy and smarter discovery — safety tools stay free.
              </p>
              <Link href="/premium" className="btn small">View membership</Link>
            </>
          )}
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Privacy & discretion</h2>

          <form action={updateVisibility} className="between">
            <div>
              <strong>Profile visibility</strong>
              <p className="muted small" style={{ margin: 0 }}>Who can discover your profile.</p>
            </div>
            <div className="row">
              <select name="visibility" defaultValue={p.visibility} style={{ margin: 0, width: "auto" }}>
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              <button className="btn small">Save</button>
            </div>
          </form>

          <PremiumToggle
            title="Incognito browsing"
            desc={`Browse without appearing in discovery. ${p.incognito ? "On." : "Off."}`}
            enabled={p.incognito}
            locked={!ent.has("incognito")}
            feature="incognito"
            action={
              <form action={setIncognito.bind(null, !p.incognito)}>
                <button className="btn ghost small">{p.incognito ? "Turn off" : "Turn on"}</button>
              </form>
            }
          />

          <PremiumToggle
            title="Verified-only browsing"
            desc={`Only see verified members in Discover. ${p.discoverVerifiedOnly ? "On." : "Off."}`}
            enabled={p.discoverVerifiedOnly}
            locked={!ent.has("verifiedOnlyBrowsing")}
            feature="verifiedOnlyBrowsing"
            action={
              <form action={setDiscoverVerifiedOnly.bind(null, !p.discoverVerifiedOnly)}>
                <button className="btn ghost small">{p.discoverVerifiedOnly ? "Turn off" : "Turn on"}</button>
              </form>
            }
          />

          <PremiumToggle
            title="Hide from general discovery"
            desc={`Stay reachable only via existing matches and direct links. ${p.hideFromDiscovery ? "On." : "Off."}`}
            enabled={p.hideFromDiscovery}
            locked={!ent.has("hideFromDiscovery")}
            feature="hideFromDiscovery"
            action={
              <form action={setHideFromDiscovery.bind(null, !p.hideFromDiscovery)}>
                <button className="btn ghost small">{p.hideFromDiscovery ? "Turn off" : "Turn on"}</button>
              </form>
            }
          />

          {ent.has("travelMode") ? (
            <form action={setTravelLocation} style={{ marginTop: 14 }}>
              <label>Travel mode</label>
              <p className="muted small" style={{ margin: "0 0 4px" }}>
                Browse as if you're in another city. Leave blank to turn off.
              </p>
              <div className="row">
                <input name="travelLocation" defaultValue={p.travelLocation ?? ""} placeholder="e.g. Seattle, WA" style={{ margin: 0, flex: 1 }} />
                <button className="btn small">Save</button>
              </div>
            </form>
          ) : p.travelLocation ? (
            // Not entitled but a destination is still set — let them clear it.
            <div className="between" style={{ marginTop: 14 }}>
              <div>
                <strong>Travel mode</strong>{" "}
                <span className="badge" style={{ fontSize: "0.65rem" }}>Premium</span>
                <p className="muted small" style={{ margin: 0 }}>Currently browsing as {p.travelLocation}.</p>
              </div>
              <form action={setTravelLocation}>
                <input type="hidden" name="travelLocation" value="" />
                <button className="btn ghost small">Turn off</button>
              </form>
            </div>
          ) : (
            <PremiumToggle
              title="Travel mode"
              desc="Browse as if you're in another city before you travel."
              enabled={false}
              locked
              feature="travelMode"
              action={null}
            />
          )}

          <hr style={{ borderColor: "var(--card-border)", margin: "16px 0" }} />

          <div className="between">
            <div>
              <strong>Emergency profile pause</strong>
              <p className="muted small" style={{ margin: 0 }}>
                Instantly hide your profile and pause messaging. {paused ? "Paused." : "Active."} (Always free.)
              </p>
            </div>
            <form action={setPaused.bind(null, !paused)}>
              <button className={`btn small ${paused ? "" : "ghost"}`}>{paused ? "Resume" : "Pause now"}</button>
            </form>
          </div>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Your data</h2>
          <p className="muted small">
            Export everything we hold about you, anytime. Data minimization is the default.
          </p>
          <a className="btn ghost" href="/api/account/export">Export my data</a>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Account</h2>
          <div className="stack">
            <form action={logout}><button className="btn ghost">Sign out</button></form>
            <DeleteAccount action={deleteAccount} />
          </div>
        </div>
      </div>
    </>
  );
}
