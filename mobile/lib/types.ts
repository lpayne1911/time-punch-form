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
