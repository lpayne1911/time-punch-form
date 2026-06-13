import { prisma } from "@/lib/db";
import { reviewVerification } from "../actions";

export const dynamic = "force-dynamic";

export default async function VerificationQueue() {
  const checks = await prisma.verificationCheck.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: { user: { include: { profile: true } } },
  });

  return (
    <>
      <h1>Verification Review</h1>
      <p className="lede">
        Checks needing a human decision (blueprint §17). Automated provider results normally
        resolve via webhook — these are the ones held for manual review.
      </p>

      {checks.length === 0 ? (
        <div className="card center muted">Nothing awaiting manual review.</div>
      ) : (
        checks.map((c) => (
          <div key={c.id} className="card sans">
            <div className="between">
              <strong>{c.user.profile?.displayName ?? c.user.email}</strong>
              <span className="badge">{c.type === "ID_DOCUMENT" ? "ID document" : "Selfie liveness"}</span>
            </div>
            <p className="muted small" style={{ margin: "4px 0" }}>
              provider: {c.provider} · grants {c.resultLevel} · {new Date(c.createdAt).toLocaleString()}
            </p>
            <form action={reviewVerification} className="row" style={{ alignItems: "flex-end" }}>
              <input type="hidden" name="checkId" value={c.id} />
              <input name="note" placeholder="note (optional)" style={{ margin: 0, flex: 1 }} />
              <button name="decision" value="APPROVED" className="btn small">Approve</button>
              <button name="decision" value="REJECTED" className="btn danger small">Reject</button>
            </form>
          </div>
        ))
      )}
    </>
  );
}
