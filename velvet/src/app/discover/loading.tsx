import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="skel skel-title" />
      <div className="filters">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="skel" style={{ width: 92, height: 34, borderRadius: 999, flex: "0 0 auto" }} />
        ))}
      </div>
      <div className="skel skel-deck" />
      <div className="row" style={{ justifyContent: "center", gap: 16, marginTop: 18 }}>
        <span className="skel" style={{ width: 54, height: 54, borderRadius: "50%" }} />
        <span className="skel" style={{ width: 66, height: 66, borderRadius: "50%" }} />
        <span className="skel" style={{ width: 54, height: 54, borderRadius: "50%" }} />
      </div>
    </LoadingShell>
  );
}
