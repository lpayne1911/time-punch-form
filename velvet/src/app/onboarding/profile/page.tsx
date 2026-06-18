import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { saveProfile } from "../actions";
import ProfileForm from "@/components/ProfileForm";
import OnboardingProgress from "@/components/OnboardingProgress";
import {
  RELATIONSHIP_INTENTIONS,
  COMMUNICATION_STYLES,
  LIFESTYLE_INTERESTS,
  BOUNDARIES,
  LOOKING_FOR,
  VALUES,
  EXPERIENCE_LEVELS,
  VISIBILITY_OPTIONS,
  parseTags,
} from "@/lib/tags";

const GROUPS = [
  {
    name: "intentions",
    label: "What you're looking for",
    options: RELATIONSHIP_INTENTIONS,
    hint: "Your relationship intentions. Pick all that fit.",
  },
  { name: "interests", label: "Lifestyle interests", options: LIFESTYLE_INTERESTS, hint: "Dynamics and themes you're drawn to." },
  { name: "communicationStyle", label: "Communication style", options: COMMUNICATION_STYLES },
  { name: "boundaries", label: "Boundaries", options: BOUNDARIES, hint: "What matters to you. Always respected here." },
  { name: "lookingFor", label: "Hoping to find", options: LOOKING_FOR },
  { name: "values", label: "Values", options: VALUES },
];

export default async function ProfileSetup({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.standardsAcceptedAt) redirect("/onboarding/standards");
  const { error } = await searchParams;
  const p = user.profile;
  const derivedAge = user.dobYear ? new Date().getFullYear() - user.dobYear : null;

  return (
    <div className="shell">
      <div className="brand">VELVET<span className="dot">.</span></div>
      <div style={{ marginTop: 20 }}>
        <OnboardingProgress current={5} />
      </div>
      <h1 style={{ marginTop: 18 }}>Complete your profile</h1>
      <p className="lede">
        Velvet matches on who you are and what you value — not on photos. A complete profile is
        what makes you discoverable to others and unlocks messaging.
      </p>
      <div className="notice small">
        <strong>What others see:</strong> your display name, age, region, and the tags you choose.
        Your photos stay blurred until you and another member both express interest, and your
        visibility setting (below) controls who can find you.
      </div>
      {error === "prompt" ? (
        <div className="notice danger small sans">
          Your prompt answers can't include contact details or anything that reads as solicitation.
          Please keep them respectful and non-explicit.
        </div>
      ) : error ? (
        <div className="notice danger small sans">
          Please add a display name, age (18+), location, and at least one interest and intention.
        </div>
      ) : null}
      <div className="card">
        <ProfileForm
          action={saveProfile}
          groups={GROUPS}
          experienceLevels={EXPERIENCE_LEVELS}
          visibilityOptions={VISIBILITY_OPTIONS}
          initial={{
            displayName: p?.displayName ?? "",
            age: p?.age ? String(p.age) : derivedAge ? String(derivedAge) : "",
            location: p?.location ?? "",
            experienceLevel: p?.experienceLevel ?? "",
            visibility: p?.visibility ?? "VERIFIED_ONLY",
            promptCommunication: p?.promptCommunication ?? "",
            promptBoundary: p?.promptBoundary ?? "",
            tags: {
              intentions: parseTags(p?.intentions),
              interests: parseTags(p?.interests),
              communicationStyle: parseTags(p?.communicationStyle),
              boundaries: parseTags(p?.boundaries),
              lookingFor: parseTags(p?.lookingFor),
              values: parseTags(p?.values),
            },
          }}
        />
      </div>
    </div>
  );
}
