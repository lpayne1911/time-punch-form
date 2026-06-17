import { requireOnboarded } from "@/lib/guard";
import { getEntitlements } from "@/lib/entitlements";
import Nav from "@/components/Nav";
import Paywall from "@/components/Paywall";

export const dynamic = "force-dynamic";

export default async function Premium({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const user = await requireOnboarded();
  const ent = await getEntitlements(user.id);
  const { feature } = await searchParams;

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Velvet Membership</h1>
        <p className="lede">
          Upgrade for more privacy, smarter compatibility, and verified-only discovery. Everything
          that keeps you safe stays free, always.
        </p>
        <Paywall currentTier={ent.tier} highlight={feature ?? null} />
      </div>
    </>
  );
}
