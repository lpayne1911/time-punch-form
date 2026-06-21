/** Shapes returned by the Velvet API, mirrored for the native client. */

export type FitBand = "Strong fit" | "Some overlap" | "Different pace";

export type Verification =
  | "UNVERIFIED"
  | "EMAIL_VERIFIED"
  | "PHOTO_VERIFIED"
  | "ID_VERIFIED";

/** A Discover deck candidate (see velvet/src/lib/matching.ts `Candidate`). */
export type Candidate = {
  userId: string;
  displayName: string;
  age: number;
  ageLabel: string | null;
  location: string;
  experienceLevel: string | null;
  verification: Verification;
  interests: string[];
  intentions: string[];
  values: string[];
  score: number;
  reason: string;
  reasons: string[];
  fit: FitBand;
  photoBlurred: boolean;
};

export type Profile = {
  displayName: string;
  age: number;
  ageLabel: string | null;
  location: string;
  experienceLevel: string | null;
  intentions: string[];
  interests: string[];
  values: string[];
  lookingFor: string[];
  completed: boolean;
};

export type Me = {
  id: string;
  email: string;
  verification: Verification;
  ageAssured: boolean;
  onboardingNext: string | null;
  profile: Profile | null;
};

export type LikeResult =
  | { matched: false }
  | { matched: true; matchId: string };

export type SwipeDirection = "left" | "right" | "up";

/* ----------------------------- Likes ------------------------------ */

export type IncomingLike = {
  userId: string;
  displayName: string;
  age: number;
  ageLabel: string | null;
  location: string;
  experienceLevel: string | null;
  verification: Verification;
  interests: string[];
  intentions: string[];
  values: string[];
  superLike: boolean;
  reason: string;
};

export type LikesData = {
  entitled: boolean;
  count: number;
  likes: IncomingLike[];
};

/* ----------------------------- Matches / messages ------------------------------ */

export type MatchBucket = "new" | "yourTurn" | "waiting";

export type MatchRow = {
  id: string;
  name: string;
  preview: string;
  quietDays: number | null;
  bucket: MatchBucket;
  expiresAt: string | null;
};

export type ThreadMessage = {
  id: string;
  body: string;
  senderId: string;
  mine: boolean;
  flagged: boolean;
  quarantined: boolean;
  readAt: string | null;
};

export type ThreadData = {
  matchId: string;
  otherId: string;
  otherName: string;
  starters: string[];
  canSeeReceipts: boolean;
  reveal: { mine: boolean; theirs: boolean; both: boolean };
  paused: { byMe: boolean } | null;
  expiresAt: string | null;
  alreadyBlocked: boolean;
  messages: ThreadMessage[];
};

/* ----------------------------- Events ------------------------------ */

export type RsvpStatus = "RESERVED" | "WAITLIST" | "CANCELED";

export type EventItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel: string;
  format: "IN_PERSON" | "ONLINE";
  location: string;
  startsAt: string;
  priceLabel: string;
  priceCents: number;
  capacity: number;
  attending: number;
  hostName: string;
  myRsvp: RsvpStatus | null;
};

export type EventsData = { isHost: boolean; events: EventItem[] };

/* ----------------------------- Billing / premium ------------------------------ */

export type Tier = "FREE" | "PLUS" | "PREMIUM" | "PRIVATE_CIRCLE";
export type Interval = "MONTH" | "YEAR";
export type ItemKind = "BOOST" | "SUPER_LIKE" | "TRAVEL_PASS";

export type TierInfo = {
  id: Tier;
  name: string;
  monthly: number;
  annual: number;
  blurb: string;
  forWho: string;
  features: string[];
  annualSavingsPct: number;
};

export type ShopItem = {
  kind: ItemKind;
  name: string;
  description: string;
  quantity: number;
  priceCents: number;
};

export type BillingData = {
  tier: Tier;
  isPaid: boolean;
  features: string[];
  likesRemaining: number | "unlimited";
  subscription: {
    tier: Tier;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  tiers: TierInfo[];
  shop: ShopItem[];
};

/* ----------------------------- Settings ------------------------------ */

export type Visibility = "MATCHES_ONLY" | "VERIFIED_ONLY" | "PUBLIC_MEMBERS";

export type SettingsData = {
  tier: Tier;
  isPaid: boolean;
  features: string[];
  paused: boolean;
  visibility: Visibility;
  incognito: boolean;
  hideFromDiscovery: boolean;
  discoverVerifiedOnly: boolean;
  discreetNotifications: boolean;
};

export type ReportCategory =
  | "HARASSMENT"
  | "EXPLICIT"
  | "SOLICITATION"
  | "SCAM"
  | "IMPERSONATION"
  | "THREAT"
  | "DOXXING"
  | "MINOR_SAFETY"
  | "OFF_PLATFORM"
  | "SPAM";
