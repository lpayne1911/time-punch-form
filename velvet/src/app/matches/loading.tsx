import LoadingShell from "@/components/LoadingShell";

export default function Loading() {
  return (
    <LoadingShell>
      <div className="skel skel-title" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skel skel-row" />
      ))}
    </LoadingShell>
  );
}
