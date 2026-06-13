import { requireOnboarded } from "@/lib/guard";
import Nav from "@/components/Nav";
import DeleteAccount from "@/components/DeleteAccount";
import { VISIBILITY_OPTIONS } from "@/lib/tags";
import {
  setPaused,
  setIncognito,
  updateVisibility,
  logout,
  deleteAccount,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function Settings() {
  const user = await requireOnboarded();
  const paused = user.status === "PAUSED";
  const incognito = user.profile?.incognito ?? false;

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Settings</h1>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Privacy & discretion</h2>

          <form action={updateVisibility} className="between">
            <div>
              <strong>Profile visibility</strong>
              <p className="muted small" style={{ margin: 0 }}>Who can discover your profile.</p>
            </div>
            <div className="row">
              <select name="visibility" defaultValue={user.profile?.visibility} style={{ margin: 0, width: "auto" }}>
                {VISIBILITY_OPTIONS.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
              <button className="btn small">Save</button>
            </div>
          </form>

          <hr style={{ borderColor: "var(--card-border)", margin: "16px 0" }} />

          <div className="between">
            <div>
              <strong>Incognito browsing</strong>
              <p className="muted small" style={{ margin: 0 }}>
                Browse without appearing in discovery. {incognito ? "On" : "Off"}.
              </p>
            </div>
            <form action={setIncognito.bind(null, !incognito)}>
              <button className="btn ghost small">{incognito ? "Turn off" : "Turn on"}</button>
            </form>
          </div>

          <hr style={{ borderColor: "var(--card-border)", margin: "16px 0" }} />

          <div className="between">
            <div>
              <strong>Emergency profile pause</strong>
              <p className="muted small" style={{ margin: 0 }}>
                Instantly hide your profile and pause messaging. {paused ? "Paused." : "Active."}
              </p>
            </div>
            <form action={setPaused.bind(null, !paused)}>
              <button className={`btn small ${paused ? "" : "ghost"}`}>
                {paused ? "Resume" : "Pause now"}
              </button>
            </form>
          </div>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Your data</h2>
          <p className="muted small">
            Export everything we hold about you, anytime. Data minimization is the default — we
            store only what the service needs.
          </p>
          <a className="btn ghost" href="/api/account/export">Export my data</a>
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>Account</h2>
          <div className="stack">
            <form action={logout}>
              <button className="btn ghost">Sign out</button>
            </form>
            <DeleteAccount action={deleteAccount} />
          </div>
        </div>
      </div>
    </>
  );
}
