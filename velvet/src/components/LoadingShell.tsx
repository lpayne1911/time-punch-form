// Static app frame (mobile app bar + shell) shown instantly while a screen's
// data streams in — keeps the chrome present so navigation feels app-like.
export default function LoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="appbar">
        <span className="brand" style={{ fontSize: "1.05rem" }}>VELVET<span className="dot">.</span></span>
      </div>
      <div className="shell">{children}</div>
    </>
  );
}
