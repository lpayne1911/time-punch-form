// Monetization model (blueprint §21-§25). Revenue comes ONLY from privacy,
// discovery, filtering, convenience, and premium community access — never from
// sexual access, content unlocks, or transactional access to specific people.
// Safety-critical features (verify, block, report, delete, safety center,
// consent education) are NEVER gated (blueprint §22).

export type Tier = "FREE" | "PLUS" | "PREMIUM" | "PRIVATE_CIRCLE";
export type Interval = "MONTH" | "YEAR";

// Every gateable capability. None of these grant access to a person or content;
// they improve privacy, discovery, compatibility, or convenience.
export type Feature =
  | "unlimitedLikes"
  | "seeWhoLikedYou"
  | "readReceipts"
  | "moreDailyRecs"
  | "incognito"
  | "verifiedOnlyBrowsing"
  | "travelMode"
  | "advancedFilters"
  | "hideFromDiscovery"
  | "profileVisibilityAudit"
  | "privateCircles"
  | "priorityProfileReview"
  | "conciergeSupport";

export const FREE_DAILY_LIKE_LIMIT = 10;

type TierDef = {
  id: Tier;
  name: string;
  monthly: number; // USD
  annual: number; // USD billed yearly
  blurb: string;
  forWho: string;
  features: Feature[]; // features ADDED at this tier (cumulative below)
};

// Cumulative: each paid tier includes everything below it.
export const TIERS: TierDef[] = [
  {
    id: "FREE",
    name: "Free",
    monthly: 0,
    annual: 0,
    blurb: "Everything you need to connect safely.",
    forWho: "Everyone. Safety tools are always free.",
    features: [],
  },
  {
    id: "PLUS",
    name: "Plus",
    monthly: 14.99,
    annual: 89.99,
    blurb: "More reach and the conveniences active members want.",
    forWho: "Active daters who want more reach.",
    features: ["unlimitedLikes", "seeWhoLikedYou", "readReceipts", "moreDailyRecs"],
  },
  {
    id: "PREMIUM",
    name: "Premium",
    monthly: 29.99,
    annual: 179.99,
    blurb: "Maximum privacy and smarter, more intentional discovery.",
    forWho: "Privacy-maximalists and high-intent members.",
    features: [
      "incognito",
      "verifiedOnlyBrowsing",
      "travelMode",
      "advancedFilters",
      "hideFromDiscovery",
      "profileVisibilityAudit",
    ],
  },
  {
    id: "PRIVATE_CIRCLE",
    name: "Private Circle",
    monthly: 59.99,
    annual: 399.99,
    blurb: "Community, events, and concierge-level discretion.",
    forWho: "Deeply private, community-oriented members.",
    features: ["privateCircles", "priorityProfileReview", "conciergeSupport"],
  },
];

const ORDER: Tier[] = ["FREE", "PLUS", "PREMIUM", "PRIVATE_CIRCLE"];

export function tierRank(t: Tier): number {
  return ORDER.indexOf(t);
}

export function tierDef(t: Tier): TierDef {
  return TIERS.find((x) => x.id === t) ?? TIERS[0];
}

// All features available at or below a tier (cumulative).
export function featuresFor(tier: Tier): Set<Feature> {
  const set = new Set<Feature>();
  for (const def of TIERS) {
    if (tierRank(def.id) <= tierRank(tier)) def.features.forEach((f) => set.add(f));
  }
  return set;
}

export type ActiveSub = {
  tier: Tier;
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} | null;

/**
 * Resolves a user's EFFECTIVE tier. An expired or canceled-and-lapsed
 * subscription falls back to FREE. (Cancelation keeps access until period end.)
 */
export function effectiveTier(sub: ActiveSub): Tier {
  if (!sub || sub.tier === "FREE") return "FREE";
  if (sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()) return "FREE";
  return sub.tier;
}

export function hasFeature(sub: ActiveSub, feature: Feature): boolean {
  return featuresFor(effectiveTier(sub)).has(feature);
}

// The lowest tier that unlocks a given feature — used to drive upgrade prompts.
export function tierForFeature(feature: Feature): Tier {
  for (const def of TIERS) {
    if (def.features.includes(feature)) return def.id;
  }
  return "PREMIUM";
}

export function price(tier: Tier, interval: Interval): number {
  const d = tierDef(tier);
  return interval === "YEAR" ? d.annual : d.monthly;
}

// Annual savings vs paying monthly, as a rounded percentage (for honest copy).
export function annualSavingsPct(tier: Tier): number {
  const d = tierDef(tier);
  if (!d.monthly) return 0;
  return Math.round((1 - d.annual / (d.monthly * 12)) * 100);
}
