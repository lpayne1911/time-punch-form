// Versioned policy text (blueprint §8, §17). Bumping a version forces users to
// re-accept on next visit — acceptance timestamps + versions are stored per user.

export const CONSENT_PLEDGE_VERSION = "1.0";
export const STANDARDS_VERSION = "1.0";

export const CONSENT_PLEDGE = {
  version: CONSENT_PLEDGE_VERSION,
  title: "The Consent Pledge",
  intro: "Everyone here agrees to this before joining. It is the heart of the community.",
  points: [
    "I commit to consent, honesty, and respect in every interaction.",
    "I will never pressure anyone, and I will honor every boundary.",
    "I understand consent can be withdrawn at any time, by anyone.",
    "I will not solicit or offer paid services of any kind.",
    "I will treat people's privacy and discretion as I expect mine to be treated.",
  ],
};

export const COMMUNITY_STANDARDS = {
  version: STANDARDS_VERSION,
  title: "Community Standards",
  intro: "We're a consent-first community of verified adults. These rules keep it safe.",
  sections: [
    {
      heading: "Everyone here is a verified adult",
      body: "Members must be 18+ (or the age of majority where they live). Accounts involving minors are removed and reported immediately.",
    },
    {
      heading: "No explicit content",
      body: "No nudity or explicit content in photos, prompts, or messages. Keep everything respectful and non-graphic.",
    },
    {
      heading: "No solicitation — this is not a marketplace",
      body: "No buying or selling of any services. No escort, companionship, or arrangement listings. No prices, no rates.",
    },
    {
      heading: "Consent and respect always",
      body: "No harassment, threats, coercion, blackmail, doxxing, or impersonation. Honor boundaries. Take 'no' as a complete answer.",
    },
    {
      heading: "Stay safe",
      body: "Meet in public, tell someone you trust, and use the safety tools. Report anything that feels wrong — moderation reviews every report.",
    },
  ],
};

export const NO_SOLICITATION_NOTICE =
  "This is not a marketplace. There is no buying or selling of services of any kind here.";

export const NO_EXPLICIT_NOTICE =
  "No nudity or explicit content. Photos and prompts must stay respectful and non-graphic.";

export const PRIVACY_PROMISE =
  "Private by default. Your profile is visible only to verified members, photos stay blurred until you both express interest, and notifications are discreet. You control who sees you.";
