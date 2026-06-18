import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { RELATIONSHIP_INTENTIONS, parseTags } from "@/lib/tags";
import { saveBasics } from "../actions";
import OnboardingProgress from "@/components/OnboardingProgress";
import BasicsForm from "@/components/BasicsForm";

export default async function Basics({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.standardsAcceptedAt) redirect("/onboarding/standards");
  const { error } = await searchParams;

  const derivedAge = user.dobYear ? new Date().getFullYear() - user.dobYear : null;

  return (
    <div className="shell" style={{ maxWidth: 540 }}>
      <div className="brand">VELVET<span className="dot">.</span></div>
      <div style={{ marginTop: 20 }}>
        <OnboardingProgress current={4} />
      </div>

      <h1 style={{ marginTop: 18 }}>The basics</h1>
      <p className="lede">
        Just enough to start exploring. You&apos;ll round out your profile next — and you can
        browse Discover as soon as this is done.
      </p>

      {error && (
        <div className="notice danger small">
          Add a display name, an approximate location, and at least one intention.
        </div>
      )}

      <div className="card">
        <BasicsForm
          action={saveBasics}
          intentions={RELATIONSHIP_INTENTIONS}
          derivedAge={derivedAge}
          initial={{
            displayName: user.profile?.displayName ?? "",
            location: user.profile?.location ?? "",
            intentions: parseTags(user.profile?.intentions),
          }}
        />
      </div>
    </div>
  );
}
