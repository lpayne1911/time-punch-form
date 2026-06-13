import { redirect, notFound } from "next/navigation";
import { requireOnboarded } from "@/lib/guard";
import { prisma } from "@/lib/db";
import Nav from "@/components/Nav";
import SimulateVerification from "@/components/SimulateVerification";

export const dynamic = "force-dynamic";

// DEV-ONLY stand-in for a provider's hosted verification flow (Persona/Veriff/
// Stripe Identity). It calls the same webhook a real provider would.
export default async function Simulate({ params }: { params: Promise<{ checkId: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();

  const user = await requireOnboarded();
  const { checkId } = await params;
  const check = await prisma.verificationCheck.findUnique({ where: { id: checkId } });
  if (!check || check.userId !== user.id) redirect("/verify");
  if (check.status !== "PENDING") redirect("/verify");

  const label = check.type === "ID_DOCUMENT" ? "government ID" : "selfie liveness";

  return (
    <>
      <Nav />
      <div className="shell" style={{ maxWidth: 500 }}>
        <h1>Identity check</h1>
        <div className="notice warn sans small">
          This screen stands in for our verification provider's secure hosted flow ({label}). In
          production you'd complete this on the provider and they'd notify us by webhook.
        </div>
        <div className="card sans center">
          <p className="muted">Simulate the provider's decision:</p>
          <SimulateVerification checkId={check.id} />
        </div>
      </div>
    </>
  );
}
