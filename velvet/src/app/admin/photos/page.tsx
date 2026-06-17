import { prisma } from "@/lib/db";
import { reviewPhoto } from "../actions";

export const dynamic = "force-dynamic";

export default async function PhotoQueue() {
  const photos = await prisma.photo.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { include: { profile: true } } },
  });

  return (
    <>
      <h1>Photo Review</h1>
      <p className="lede">
        Every uploaded photo starts here and is hidden from others until approved. Reject anything
        explicit, nude, containing contact info, or otherwise against the standards (blueprint §18).
      </p>

      {photos.length === 0 ? (
        <div className="card center muted">No photos awaiting review.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
          {photos.map((p) => (
            <div key={p.id} className="card sans" style={{ margin: 0 }}>
              {/* Staff can view the real image via the access-controlled route */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photo/${p.id}`}
                alt="pending review"
                style={{ width: "100%", borderRadius: 12, maxHeight: 240, objectFit: "cover" }}
              />
              <p className="small" style={{ margin: "8px 0 2px" }}>
                <strong>{p.user.profile?.displayName ?? p.user.email}</strong>
              </p>
              {p.autoFlagged && (
                <p className="muted small" style={{ margin: 0 }}>⚑ auto: {p.autoFlagReason}</p>
              )}
              <form action={reviewPhoto} style={{ marginTop: 8 }}>
                <input type="hidden" name="photoId" value={p.id} />
                <input name="note" placeholder="Note (optional)" style={{ margin: "0 0 8px" }} />
                <div className="row">
                  <button name="decision" value="APPROVED" className="btn small">Approve</button>
                  <button name="decision" value="REJECTED" className="btn danger small">Reject</button>
                </div>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
