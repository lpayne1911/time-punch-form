import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { getCandidates, type DiscoverFilters } from "@/lib/matching";
import { likesRemainingToday } from "@/lib/entitlements";
import { RELATIONSHIP_INTENTIONS, EXPERIENCE_LEVELS } from "@/lib/tags";
import Nav from "@/components/Nav";
import SwipeDeck from "@/components/SwipeDeck";

export const dynamic = "force-dynamic";

type SearchParams = { [key: string]: string | string[] | undefined };

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Build a Discover URL with one filter toggled on/off, preserving the others. */
function toggleHref(current: DiscoverFilters, key: keyof DiscoverFilters, value: string | boolean) {
  const next: Record<string, string> = {};
  if (current.intention) next.intention = current.intention;
  if (current.experience) next.experience = current.experience;
  if (current.verifiedOnly) next.verified = "1";

  if (key === "verifiedOnly") {
    if (current.verifiedOnly) delete next.verified;
    else next.verified = "1";
  } else {
    const active = current[key] === value;
    if (active) delete next[key];
    else next[key as string] = value as string;
  }
  const qs = new URLSearchParams(next).toString();
  return qs ? `/discover?${qs}` : "/discover";
}

export default async function Discover({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireOnboarded();
  const sp = await searchParams;

  const filters: DiscoverFilters = {
    intention: one(sp.intention),
    experience: one(sp.experience),
    verifiedOnly: one(sp.verified) === "1",
  };

  const candidates = await getCandidates(user.id, 20, filters);
  const remaining = await likesRemainingToday(user.id);
  const anyFilter = Boolean(filters.intention || filters.experience || filters.verifiedOnly);

  return (
    <>
      <Nav />
      <div className="shell">
        <div className="between">
          <h1 style={{ margin: 0 }}>Discover</h1>
          {remaining !== "unlimited" && (
            <span className="badge">{remaining} likes left</span>
          )}
        </div>

        {!user.profile?.completed && (
          <div className="notice warn">
            <strong>You&apos;re previewing with a basic profile.</strong> Complete your profile to
            appear in Discover for others and to unlock messaging.
            <div style={{ marginTop: 10 }}>
              <Link href="/onboarding/profile" className="btn small">Complete my profile</Link>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="filters">
          <Link
            href={toggleHref(filters, "verifiedOnly", true)}
            className={`chip${filters.verifiedOnly ? " on" : ""}`}
          >
            ✓ Verified only
          </Link>
          {RELATIONSHIP_INTENTIONS.map((i) => (
            <Link
              key={i}
              href={toggleHref(filters, "intention", i)}
              className={`chip${filters.intention === i ? " on" : ""}`}
            >
              {i}
            </Link>
          ))}
          {EXPERIENCE_LEVELS.map((e) => (
            <Link
              key={e}
              href={toggleHref(filters, "experience", e)}
              className={`chip${filters.experience === e ? " on" : ""}`}
            >
              {e}
            </Link>
          ))}
          {anyFilter && (
            <Link href="/discover" className="chip clear">Clear filters</Link>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="card center">
            <p className="muted">
              {anyFilter
                ? "No members match these filters right now. Try clearing a filter."
                : "No compatible members to show right now. Check back soon — Velvet grows carefully and prioritizes safety over volume."}
            </p>
          </div>
        ) : (
          <SwipeDeck candidates={candidates} />
        )}
      </div>
    </>
  );
}
