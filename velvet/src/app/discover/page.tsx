import Link from "next/link";
import { requireOnboarded } from "@/lib/guard";
import { getCandidates, type DiscoverFilters } from "@/lib/matching";
import { likesRemainingToday } from "@/lib/entitlements";
import { FREE_DAILY_LIKE_LIMIT } from "@/lib/billing";
import { RELATIONSHIP_INTENTIONS, EXPERIENCE_LEVELS } from "@/lib/tags";
import Nav from "@/components/Nav";
import DiscoverCard from "@/components/DiscoverCard";

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

  // "Today's picks" — the strongest few, given a reason to come back daily.
  const picks = candidates.slice(0, 3);
  const rest = candidates.slice(3);

  const used = remaining === "unlimited" ? 0 : FREE_DAILY_LIKE_LIMIT - remaining;
  const pct = remaining === "unlimited" ? 100 : Math.round((remaining / FREE_DAILY_LIKE_LIMIT) * 100);

  return (
    <>
      <Nav />
      <div className="shell">
        <h1>Discover</h1>
        <p className="lede">
          People we think you'll connect with — based on shared values, intentions, and
          communication style. Photos stay blurred until you both express interest.
        </p>

        {!user.profile?.completed && (
          <div className="notice warn">
            <strong>You&apos;re previewing with a basic profile.</strong> Complete your profile to
            appear in Discover for others and to unlock messaging.
            <div style={{ marginTop: 10 }}>
              <Link href="/onboarding/profile" className="btn small">Complete my profile</Link>
            </div>
          </div>
        )}

        {remaining !== "unlimited" && (
          <div className="likes-meter">
            <div className="between">
              <span className="small">
                <strong>{remaining}</strong> like{remaining === 1 ? "" : "s"} left today
              </span>
              <Link href="/premium?feature=unlimitedLikes" className="small">Unlimited with Plus</Link>
            </div>
            <div className="meter-track" aria-hidden>
              <div className="meter-fill" style={{ width: `${pct}%` }} />
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
          <>
            <h2>Today&apos;s picks</h2>
            {picks.map((c) => (
              <DiscoverCard key={c.userId} candidate={c} highlight />
            ))}
            {rest.length > 0 && (
              <>
                <h2>More people</h2>
                {rest.map((c) => (
                  <DiscoverCard key={c.userId} candidate={c} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
