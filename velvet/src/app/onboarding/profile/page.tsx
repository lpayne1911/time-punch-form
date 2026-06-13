import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { saveProfile } from "../actions";
import ProfileForm from "@/components/ProfileForm";
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

  return (
    <div className="shell">
      <div className="brand">VELVET<span className="dot">.</span></div>
      <h1 style={{ marginTop: 24 }}>Create your profile</h1>
      <p className="lede">
        Velvet matches on who you are and what you value — not on photos. Be thoughtful; keep
        everything respectful and non-explicit.
      </p>
      {error && (
        <div className="notice danger small sans">
          Please add a display name, age (18+), location, and at least one interest and intention.
        </div>
      )}
      <div className="card">
        <ProfileForm
          action={saveProfile}
          groups={GROUPS}
          experienceLevels={EXPERIENCE_LEVELS}
          visibilityOptions={VISIBILITY_OPTIONS}
          initial={{
            displayName: p?.displayName ?? "",
            age: p?.age ? String(p.age) : "",
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
