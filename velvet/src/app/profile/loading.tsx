import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="skel skel-title" />
      <div className="skel" style={{ height: 80, borderRadius: 18, margin: "12px 0" }} />
      <div className="skel" style={{ height: 220, borderRadius: 18, margin: "12px 0" }} />
      <div className="skel skel-row" />
    </LoadingShell>
  );
}
