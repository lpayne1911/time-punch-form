import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import { LEVEL_LABELS, levelRank } from "@/lib/verification-levels";
import VerifyActions from "@/components/VerifyActions";

export const dynamic = "force-dynamic";

export default async function Verify() {
  const user = await requireOnboarded();
  const checks = await prisma.verificationCheck.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const rank = levelRank(user.verification);
  const pendingPhoto = checks.find((c) => c.type === "PHOTO_LIVENESS" && c.status === "PENDING");
  const pendingId = checks.find((c) => c.type === "ID_DOCUMENT" && c.status === "PENDING");

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 600 }}>
        <h1>Verification</h1>
        <p className="lede">
          Verification builds trust and unlocks more of Velvet. The more verified you are, the more
          members will connect with you — and you can browse verified-only.
        </p>

        <div className="card sans">
          <div className="between">
            <strong>Your level</strong>
            <span className="badge">{LEVEL_LABELS[user.verification]}</span>
          </div>
          <ul className="small stack" style={{ paddingLeft: 18, marginTop: 10 }}>
            <li>{rank >= 1 ? "✓" : "○"} Email verified — done at sign-in</li>
            <li>{rank >= 2 ? "✓" : "○"} Photo verified — a quick selfie liveness check</li>
            <li>{rank >= 3 ? "✓" : "○"} ID verified — confirms you're a real adult (strongest trust)</li>
          </ul>
          {user.ageAssured && (
            <div className="notice ok small">Your age has been verified by a document check.</div>
          )}
        </div>

        <div className="card sans">
          <h2 style={{ marginTop: 0 }}>What verification unlocks</h2>
          <ul className="small stack" style={{ paddingLeft: 18 }}>
            <li>A visible trust badge on your profile</li>
            <li>Visibility to members who browse verified-only</li>
            <li>Eligibility to apply as an event host (ID recommended)</li>
            <li>Access to verified-only events and circles</li>
          </ul>
        </div>

        <VerifyActions
          level={user.verification}
          pendingPhoto={!!pendingPhoto}
          pendingId={!!pendingId}
        />

        <p className="muted small sans" style={{ marginTop: 16 }}>
          Verification is handled by a secure identity provider. We store only the result and a
          tokenized reference — never your ID images or document numbers.
        </p>
      </div>
    </>
  );
}
