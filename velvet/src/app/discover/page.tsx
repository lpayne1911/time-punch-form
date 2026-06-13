import { requireOnboarded } from "@/lib/guard";
import { getCandidates } from "@/lib/matching";
import Nav from "@/components/Nav";
import DiscoverCard from "@/components/DiscoverCard";

export const dynamic = "force-dynamic";

export default async function Discover() {
  const user = await requireOnboarded();
  const candidates = await getCandidates(user.id);

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Discover</h1>
        <p className="lede">
          People we think you'll connect with — based on shared values, intentions, and
          communication style. Photos stay blurred until you both express interest.
        </p>

        {candidates.length === 0 ? (
          <div className="card center">
            <p className="muted">
              No compatible members to show right now. Check back soon — Velvet grows carefully and
              prioritizes safety over volume.
            </p>
          </div>
        ) : (
          candidates.map((c) => <DiscoverCard key={c.userId} candidate={c} />)
        )}
      </div>
    </>
  );
}
